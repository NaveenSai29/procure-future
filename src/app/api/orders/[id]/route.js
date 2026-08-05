import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";
import { NotificationService } from "@/services/notification.service";

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

async function handleAutoRefund(order, reason) {
  try {
    const refunds = [];
    if (order.paymentMethod === 'ONLINE' && order.razorpayPaymentId) {
      try {
        const { RazorpayService } = await import('@/services/razorpay.service');
        await RazorpayService.createRefund({ paymentId: order.razorpayPaymentId });
        await prisma.refundTransaction.create({
          data: { orderId: order.id, userId: order.buyerId, amount: order.totalAmount, paymentMethod: 'RAZORPAY', transactionId: order.razorpayPaymentId, status: 'PROCESSED', processedAt: new Date() },
        });
        refunds.push('Razorpay');
      } catch (err) { console.error('Razorpay refund error:', err.message); }
    }
    if (order.walletDeduction > 0) {
      let wallet = await prisma.buyerWallet.findUnique({ where: { userId: order.buyerId } });
      if (wallet) {
        const newBalance = wallet.balance + order.walletDeduction;
        await prisma.buyerWallet.update({ where: { id: wallet.id }, data: { balance: newBalance } });
        await prisma.buyerWalletTransaction.create({
          data: { walletId: wallet.id, type: 'CREDIT', amount: order.walletDeduction, referenceType: 'REFUND', referenceId: order.id, description: `Refund for cancelled order #${order.id.slice(0, 8)}`, balanceBefore: wallet.balance, balanceAfter: newBalance },
        });
        refunds.push('Wallet');
      }
    }
    if (order.paymentMethod === 'COD') { refunds.push('COD (no charge)'); }
    const refundMsg = refunds.length > 0 ? refunds.join(' + ') : 'No payment to refund';
    NotificationService.send({
      userId: order.buyerId, type: 'IN_APP', title: '💰 Refund Processed',
      message: `Order #${order.id.slice(0, 8).toUpperCase()} ${reason}. Refund: ${refundMsg}. Amount: ₹${order.totalAmount.toLocaleString('en-IN')}`,
    }).catch(() => {});
  } catch (err) { console.error('Auto-refund error:', err.message); }
}

// GET - Single order (includes refund info)
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
        delivery: {
          select: {
            id: true,
            status: true,
            otp: true,
            pickupTime: true,
            deliveryTime: true,
            partner: {
              select: {
                id: true,
                rating: true,
                activeVehicle: {
                  select: { vehicleType: true, vehicleNumber: true },
                },
                user: {
                  select: { id: true, name: true, mobile: true },
                },
              },
            },
          },
        },
      },
    });
    if (!order) return errorResponse("Order not found", 404);

    let refund = null;
    if (['CANCELLED', 'DECLINED'].includes(order.status)) {
      refund = await prisma.refundTransaction.findFirst({
        where: { orderId: id },
        orderBy: { createdAt: 'desc' },
      });
    }

    return successResponse({ ...order, refund });
  } catch (error) { return errorResponse("Failed to fetch order", 500); }
}

// PATCH - Update order (cancel by buyer, status by supplier, payment method by buyer)
export async function PATCH(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);
    const { id } = await params;
    const body = await request.json();
    const { status, declineReason, paymentMethod, razorpayPaymentId } = body;
    const order = await prisma.order.findUnique({
      where: { id },
      include: { product: true, statusHistory: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    if (!order) return errorResponse("Order not found", 404);

    // ─── BUYER: Switch payment method (COD → Online) ───
    if (paymentMethod && !status) {
      if (order.buyerId !== session.userId) return errorResponse("Only the buyer can update payment method", 403);
      if ((order.paymentMethod || '').toUpperCase() !== 'COD' || (paymentMethod || '').toUpperCase() !== 'ONLINE') return errorResponse("Can only switch from COD to Online payment", 422);
      if (['DELIVERED', 'CANCELLED', 'DECLINED'].includes(order.status)) return errorResponse(`Cannot change payment for ${order.status} order`, 422);
      const updated = await prisma.order.update({ where: { id }, data: { paymentMethod: 'ONLINE', razorpayPaymentId: razorpayPaymentId || null } });
      await prisma.auditLog.create({ data: { userId: session.userId, action: 'ORDER_PAYMENT_SWITCH', entity: 'Order', entityId: id, newValue: { paymentMethod: 'ONLINE', razorpayPaymentId }, oldValue: { paymentMethod: 'COD' } } }).catch(() => {});
      NotificationService.send({ userId: order.buyerId, type: 'IN_APP', title: '💳 Payment Switched', message: `Order #${order.id.slice(0, 8).toUpperCase()} is now paid online.` }).catch(() => {});
      return successResponse({ order: updated, message: 'Payment method updated to Online' });
    }

    if (!status) return errorResponse("Status is required", 422);

    // ─── BUYER: Cancel own order (only when PENDING) ───
    if (status === 'CANCELLED' && order.buyerId === session.userId) {
      if (order.status !== 'PENDING') return errorResponse("Can only cancel orders that are still pending", 422);
      const updated = await prisma.order.update({ where: { id }, data: { status: 'CANCELLED' } });
      await prisma.orderStatusHistory.create({
        data: { orderId: order.id, fromStatus: order.status, toStatus: 'CANCELLED', changedBy: session.userId, notes: 'Cancelled by buyer' },
      });
      handleAutoRefund(order, 'cancelled by buyer')
        .then(() => console.log('✅ Auto-refund completed'))
        .catch((err) => console.error('❌ Auto-refund failed:', err.message));
      NotificationService.send({
        userId: order.buyerId, type: 'IN_APP', title: '❌ Order Cancelled',
        message: `Order #${order.id.slice(0, 8).toUpperCase()} has been cancelled. Refund will be processed.`,
      }).catch(() => {});
      return successResponse({ order: updated, message: 'Order cancelled successfully' });
    }

    // ─── SUPPLIER: All other status updates ───
    if (status === "DECLINED" && !declineReason) return errorResponse("Please provide a reason for declining", 422);
    const staff = await prisma.supplierStaff.findFirst({ where: { userId: session.userId } });
    if (!staff) return errorResponse("Only suppliers can update status", 403);
    if (order.product.supplierId !== staff.supplierId) return errorResponse("You don't own this order", 403);
    if (order.status === "DELIVERED" || order.status === "DECLINED" || order.status === "CANCELLED") return errorResponse(`Order is ${order.status}. Cannot change.`, 422);
    const allowedForward = forwardTransitions[order.status] || [];
    if (!allowedForward.includes(status)) return errorResponse(`Cannot change from ${order.status} to ${status}. Allowed: ${allowedForward.join(", ")}`, 422);

    const inventory = await prisma.warehouseInventory.findFirst({ where: { productId: order.productId } });
    if (status === "ACCEPTED" && order.status === "PENDING") {
      if (!inventory || inventory.availableQty < order.quantity) return errorResponse(`Insufficient stock. Available: ${inventory?.availableQty || 0}`, 422);
      await prisma.warehouseInventory.update({ where: { id: inventory.id }, data: { availableQty: inventory.availableQty - order.quantity, reservedQty: inventory.reservedQty + order.quantity } });
    }
    if (status === "DELIVERED" && inventory) {
      await prisma.warehouseInventory.update({ where: { id: inventory.id }, data: { reservedQty: Math.max(0, inventory.reservedQty - order.quantity) } });
    }
    const updated = await prisma.order.update({ where: { id }, data: { status } });
    const historyData = { orderId: order.id, fromStatus: order.status, toStatus: status, changedBy: session.userId };
    if (status === "DECLINED") historyData.notes = `Declined: ${declineReason}`;
    
    if (status === "READY_FOR_PICKUP") {
      historyData.notes = "Order packed and ready for pickup";
      // ─── AUTO-ASSIGN DELIVERY PARTNER ───
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        console.log('🔄 Auto-assigning delivery for order:', id.slice(0, 8));
        const assignRes = await fetch(`${baseUrl}/api/delivery/auto-assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: id }),
        });
        const assignData = await assignRes.json();
        if (assignData.success) {
          console.log('✅ Auto-assigned:', assignData.data?.message);
          historyData.notes += ` | ✅ Auto-assigned: ${assignData.data?.message || 'Partner assigned'}`;
        } else {
          console.log('⚠️ Auto-assign failed:', assignData.message);
          historyData.notes += ` | ⚠️ ${assignData.message || 'Auto-assign failed'}`;
        }
      } catch (e) {
        console.error('❌ Auto-assign error:', e.message);
        historyData.notes += ' | Auto-assign error: ' + e.message;
      }
    }
    
    await prisma.orderStatusHistory.create({ data: historyData });

    if (status === 'DECLINED' || status === 'CANCELLED') { handleAutoRefund(order, status === 'DECLINED' ? 'declined by supplier' : 'cancelled')
    .then(() => console.log('✅ Auto-refund completed'))
    .catch((err) => console.error('❌ Auto-refund failed:', err.message)); }
    if (status === "ACCEPTED") { autoAdvanceOrder(order.id, 'ACCEPTED', 'PROCESSING'); }
    if (status === "DELIVERED") { handleReferralReward(order).catch(() => {}); }

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
  } catch (error) { console.error("Update order error:", error); return errorResponse("Failed to update order", 500); }
}