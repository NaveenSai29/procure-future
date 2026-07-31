import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";
import { NotificationService } from "@/services/notification.service";

// Simplified transitions
const forwardTransitions = {
  PENDING: ["ACCEPTED", "DECLINED"],
  ACCEPTED: ["PROCESSING"],
  PROCESSING: ["READY_FOR_PICKUP"],
  READY_FOR_PICKUP: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
  DECLINED: [],
};

// Auto-advance only from ACCEPTED to PROCESSING
async function autoAdvanceOrder(orderId, fromStatus, toStatus) {
  try {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (order && order.status === fromStatus) {
      await prisma.order.update({ where: { id: orderId }, data: { status: toStatus } });
      await prisma.orderStatusHistory.create({
        data: { orderId, fromStatus, toStatus, changedBy: 'SYSTEM', notes: 'Auto-advanced' },
      });

      const statusMessages = {
        PROCESSING: { title: '📦 Preparing', message: `Order #${order.id.slice(0, 8).toUpperCase()} is being prepared.` },
      };
      const msg = statusMessages[toStatus];
      if (msg) {
        NotificationService.send({ userId: order.buyerId, type: 'IN_APP', title: msg.title, message: msg.message }).catch(() => {});
      }
    }
  } catch (err) { console.error('Auto-advance error:', err.message); }
}

// Auto-credit referral reward when order is delivered
async function handleReferralReward(order) {
  try {
    const buyer = await prisma.user.findUnique({
      where: { id: order.buyerId }, select: { id: true, referredBy: true, name: true },
    });
    if (!buyer?.referredBy) return;

    const referral = await prisma.referral.findFirst({
      where: { referrerId: buyer.referredBy, referredId: order.buyerId, status: "PURCHASED" },
    });
    if (!referral) return;

    let rewardAmount = 100;
    try {
      const setting = await prisma.systemSetting.findFirst({ where: { category: 'REFERRAL', key: 'reward_amount' } });
      if (setting) { const val = parseInt(setting.value); if (!isNaN(val) && val > 0) rewardAmount = val; }
    } catch {}

    let wallet = await prisma.buyerWallet.findUnique({ where: { userId: buyer.referredBy } });
    if (!wallet) wallet = await prisma.buyerWallet.create({ data: { userId: buyer.referredBy, balance: 0 } });

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + rewardAmount;

    await prisma.buyerWalletTransaction.create({
      data: { walletId: wallet.id, type: "CREDIT", amount: rewardAmount, referenceType: "REFERRAL_BONUS", referenceId: referral.id, description: `Referral reward for ${buyer.name || 'friend'}`, balanceBefore, balanceAfter },
    });
    await prisma.buyerWallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });
    await prisma.referral.update({ where: { id: referral.id }, data: { status: "PAID", rewardAmount, processedAt: new Date() } });

    const referrer = await prisma.user.findUnique({ where: { id: buyer.referredBy }, select: { name: true } });
    NotificationService.send({ userId: buyer.referredBy, type: 'IN_APP', title: '💰 Referral Reward Credited!', message: `${referrer?.name || 'You'} earned ₹${rewardAmount.toLocaleString('en-IN')}!` }).catch(() => {});
  } catch (err) { console.error('Referral reward error:', err.message); }
}

// GET - Single order
export async function GET(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            name: true, sku: true, supplierId: true, unit: true,
            supplier: {
              select: {
                id: true, businessName: true, mobile: true,
                warehouses: { where: { isActive: true, isPickupLocation: true }, take: 1, select: { latitude: true, longitude: true, city: true, state: true } },
              },
            },
          },
        },
        buyer: { select: { name: true, email: true } },
        statusHistory: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });
    if (!order) return errorResponse("Order not found", 404);
    return successResponse(order);
  } catch (error) { return errorResponse("Failed to fetch order", 500); }
}

// PATCH - Update order status
export async function PATCH(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { id } = await params;
    const body = await request.json();
    const { status, declineReason } = body;

    if (!status) return errorResponse("Status is required", 422);
    if (status === "DECLINED" && !declineReason) return errorResponse("Please provide a reason for declining", 422);

    const order = await prisma.order.findUnique({
      where: { id },
      include: { product: true, statusHistory: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    if (!order) return errorResponse("Order not found", 404);

    const staff = await prisma.supplierStaff.findFirst({ where: { userId: session.userId } });
    if (!staff) return errorResponse("Only suppliers can update status", 403);
    if (order.product.supplierId !== staff.supplierId) return errorResponse("You don't own this order", 403);

    if (order.status === "DELIVERED" || order.status === "DECLINED" || order.status === "CANCELLED") {
      return errorResponse(`Order is ${order.status}. Cannot change.`, 422);
    }

    const allowedForward = forwardTransitions[order.status] || [];
    if (!allowedForward.includes(status)) {
      return errorResponse(`Cannot change from ${order.status} to ${status}. Allowed: ${allowedForward.join(", ")}`, 422);
    }

    // Inventory handling
    const inventory = await prisma.warehouseInventory.findFirst({ where: { productId: order.productId } });

    if (status === "ACCEPTED" && order.status === "PENDING") {
      if (!inventory || inventory.availableQty < order.quantity) {
        return errorResponse(`Insufficient stock. Available: ${inventory?.availableQty || 0}`, 422);
      }
      await prisma.warehouseInventory.update({
        where: { id: inventory.id },
        data: { availableQty: inventory.availableQty - order.quantity, reservedQty: inventory.reservedQty + order.quantity },
      });
    }

    if (status === "DELIVERED" && inventory) {
      await prisma.warehouseInventory.update({
        where: { id: inventory.id },
        data: { reservedQty: Math.max(0, inventory.reservedQty - order.quantity) },
      });
    }

    const updated = await prisma.order.update({ where: { id }, data: { status } });

    const historyData = { orderId: order.id, fromStatus: order.status, toStatus: status, changedBy: session.userId };
    if (status === "DECLINED") historyData.notes = `Declined: ${declineReason}`;
    if (status === "READY_FOR_PICKUP") historyData.notes = "Order packed and ready for pickup";
    await prisma.orderStatusHistory.create({ data: historyData });

    // Auto-advance from ACCEPTED to PROCESSING
    if (status === "ACCEPTED") {
      autoAdvanceOrder(order.id, 'ACCEPTED', 'PROCESSING');
    }

    // Referral reward on delivery
    if (status === "DELIVERED") { handleReferralReward(order).catch(() => {}); }

    // Notifications
    try {
      const orderRef = order.id.slice(0, 8).toUpperCase();
      const statusMessages = {
        ACCEPTED: { title: '✅ Order Accepted', message: `Order #${orderRef} accepted! Preparing your order.` },
        PROCESSING: { title: '📦 Preparing', message: `Order #${orderRef} is being prepared.` },
        READY_FOR_PICKUP: { title: '📦 Ready for Pickup', message: `Order #${orderRef} is packed and ready!` },
        SHIPPED: { title: '🚚 On the Way!', message: `Order #${orderRef} is out for delivery!` },
        DELIVERED: { title: '🎉 Delivered!', message: `Order #${orderRef} delivered. Enjoy!` },
        DECLINED: { title: '❌ Order Declined', message: `Order #${orderRef} was declined. Reason: ${declineReason || 'Not specified'}` },
      };
      const msg = statusMessages[status];
      if (msg) { NotificationService.send({ userId: order.buyerId, type: 'IN_APP', title: msg.title, message: msg.message }).catch(() => {}); }
    } catch (notifErr) { console.error('Notification error:', notifErr.message); }

    return successResponse(updated);
  } catch (error) {
    console.error("Update order error:", error);
    return errorResponse("Failed to update order", 500);
  }
}