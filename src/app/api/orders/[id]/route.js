import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";
import { NotificationService } from "@/services/notification.service";
import { EmailService } from "@/services/email.service";

// Valid forward transitions
const forwardTransitions = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

// GET - Single order
export async function GET(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        product: { select: { name: true, sku: true } },
        buyer: { select: { name: true, email: true } },
        statusHistory: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    if (!order) return errorResponse("Order not found", 404);
    return successResponse(order);
  } catch (error) {
    console.error("Get order error:", error);
    return errorResponse("Failed to fetch order", 500);
  }
}

// PATCH - Update order status
export async function PATCH(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { id } = await params;
    const body = await request.json();
    const { status, revert } = body;

    if (!status) return errorResponse("Status is required", 422);

    // Get current order
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        product: true,
        statusHistory: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!order) return errorResponse("Order not found", 404);

    // Verify supplier owns this order
    const staff = await prisma.supplierStaff.findFirst({
      where: { userId: session.userId },
    });
    if (!staff) return errorResponse("Only suppliers can update status", 403);
    if (order.product.supplierId !== staff.supplierId) {
      return errorResponse("You don't own this order", 403);
    }

    // If final status, no changes allowed
    if (order.status === "DELIVERED" || order.status === "CANCELLED") {
      return errorResponse(`Order is ${order.status}. Cannot change.`, 422);
    }

    let isRevert = false;
    let newStatus = status;

    // Check if this is a forward move
    const allowedForward = forwardTransitions[order.status] || [];

    if (allowedForward.includes(status)) {
      isRevert = false;
    } else {
      const lastHistory = order.statusHistory[0];
      const logicalPrevious = {
        CONFIRMED: "PENDING",
        PROCESSING: "CONFIRMED",
        SHIPPED: "PROCESSING",
        DELIVERED: "SHIPPED",
      };
      const isValidRevert = 
        (lastHistory && lastHistory.fromStatus === status && revert === true) ||
        (logicalPrevious[order.status] === status && revert === true);
      
      if (isValidRevert) {
        isRevert = true;
      } else {
        return errorResponse(
          `Cannot change from ${order.status} to ${status}. Allowed forward: ${allowedForward.join(", ") || "none"}. You can only revert the last change.`,
          422
        );
      }
    }

    // Handle inventory
    const inventory = await prisma.warehouseInventory.findFirst({
      where: { productId: order.productId },
    });

    // FORWARD: PENDING → CONFIRMED (reserve stock)
    if (!isRevert && status === "CONFIRMED" && order.status === "PENDING") {
      if (!inventory || inventory.availableQty < order.quantity) {
        return errorResponse(`Insufficient stock. Available: ${inventory?.availableQty || 0}`, 422);
      }
      await prisma.warehouseInventory.update({
        where: { id: inventory.id },
        data: {
          availableQty: inventory.availableQty - order.quantity,
          reservedQty: inventory.reservedQty + order.quantity,
        },
      });
    }

    // FORWARD: SHIPPED → DELIVERED (remove reserved)
    if (!isRevert && status === "DELIVERED") {
      if (inventory) {
        await prisma.warehouseInventory.update({
          where: { id: inventory.id },
          data: {
            reservedQty: Math.max(0, inventory.reservedQty - order.quantity),
          },
        });
      }
    }

    // CANCELLED (return to available)
    if (status === "CANCELLED") {
      if (inventory && order.status !== "CANCELLED") {
        await prisma.warehouseInventory.update({
          where: { id: inventory.id },
          data: {
            reservedQty: Math.max(0, inventory.reservedQty - order.quantity),
            availableQty: inventory.availableQty + order.quantity,
          },
        });
      }
    }

    // REVERT: CONFIRMED → PENDING (return reserved to available)
    if (isRevert && order.status === "CONFIRMED" && status === "PENDING") {
      if (inventory && inventory.reservedQty >= order.quantity) {
        await prisma.warehouseInventory.update({
          where: { id: inventory.id },
          data: {
            reservedQty: inventory.reservedQty - order.quantity,
            availableQty: inventory.availableQty + order.quantity,
          },
        });
      }
    }

    // Update order
    const updated = await prisma.order.update({
      where: { id },
      data: { status },
    });

    // Record in history
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: status,
        changedBy: session.userId,
      },
    });

    // ─── SEND NOTIFICATION ON STATUS CHANGE ───
    try {
      const statusMessages = {
        CONFIRMED: { title: '✅ Order Confirmed', message: `Your order #${order.id.slice(0,8)} has been confirmed and is being processed.` },
        PROCESSING: { title: '📦 Order Processing', message: `Your order #${order.id.slice(0,8)} is being packed and prepared for shipping.` },
        SHIPPED: { title: '🚚 Order Shipped!', message: `Your order #${order.id.slice(0,8)} is on the way! Track your delivery in real-time.` },
        DELIVERED: { title: '🎉 Order Delivered!', message: `Your order #${order.id.slice(0,8)} has been delivered. Enjoy your purchase!` },
        CANCELLED: { title: '❌ Order Cancelled', message: `Your order #${order.id.slice(0,8)} has been cancelled. Refund will be processed if applicable.` },
      };

      const msg = statusMessages[status];
      if (msg) {
        // In-app notification to buyer
        NotificationService.send({
          userId: order.buyerId,
          type: 'IN_APP',
          title: msg.title,
          message: msg.message,
        }).catch(() => {});

        // Email for major status changes
        if (['SHIPPED', 'DELIVERED', 'CANCELLED'].includes(status)) {
          const buyer = await prisma.user.findUnique({
            where: { id: order.buyerId },
            select: { email: true, name: true },
          });
          if (buyer?.email) {
            const statusEmails = {
              SHIPPED: {
                subject: `🚚 Your Order #${order.id.slice(0,8)} is on the way!`,
                html: `<div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;"><h2 style="color: #059669;">Order Shipped!</h2><p>Hi ${buyer.name}, your order <strong>#${order.id.slice(0,8)}</strong> has been shipped and is on its way to you.</p><p>Track your order in the app for live updates.</p></div>`,
              },
              DELIVERED: {
                subject: `🎉 Order #${order.id.slice(0,8)} Delivered!`,
                html: `<div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;"><h2 style="color: #059669;">Order Delivered!</h2><p>Hi ${buyer.name}, your order <strong>#${order.id.slice(0,8)}</strong> has been delivered successfully.</p><p>We hope you love your purchase! Please rate your experience.</p></div>`,
              },
              CANCELLED: {
                subject: `Order #${order.id.slice(0,8)} Cancelled`,
                html: `<div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;"><h2 style="color: #dc2626;">Order Cancelled</h2><p>Hi ${buyer.name}, your order <strong>#${order.id.slice(0,8)}</strong> has been cancelled.</p><p>Any payment will be refunded to your original payment method.</p></div>`,
              },
            };
            const emailData = statusEmails[status];
            if (emailData) {
              EmailService.sendEmail({
                to: buyer.email,
                subject: emailData.subject,
                html: emailData.html,
              }).catch(() => {});
            }
          }
        }
      }
    } catch (notifErr) {
      console.error('Status notification error:', notifErr.message);
    }

    return successResponse({
      order: updated,
      previousStatus: order.status,
      newStatus: status,
      isRevert,
      message: isRevert
        ? `Order reverted from ${order.status} back to ${status}`
        : `Order status changed from ${order.status} to ${status}`,
    });
  } catch (error) {
    console.error("Update order error:", error);
    return errorResponse(error.message || "Failed to update order", 500);
  }
}