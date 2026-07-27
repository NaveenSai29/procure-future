import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";
import { NotificationService } from "@/services/notification.service";

// GET - Single return request
export async function GET(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { id } = await params;
    const returnReq = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        order: { include: { product: { select: { name: true } } } },
        buyer: { select: { name: true, email: true } },
      },
    });

    if (!returnReq) return errorResponse("Return not found", 404);
    return successResponse(returnReq);
  } catch (error) {
    console.error("Get return error:", error);
    return errorResponse("Failed to fetch return", 500);
  }
}

// PATCH - Update return status
export async function PATCH(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { id } = await params;
    const body = await request.json();
    const { status, refundAmount } = body;

    if (!status) return errorResponse("Status is required", 422);

    const returnReq = await prisma.returnRequest.findUnique({ where: { id } });
    if (!returnReq) return errorResponse("Return not found", 404);

    // Cannot change COMPLETED or REJECTED returns
    if (returnReq.status === "COMPLETED" || returnReq.status === "REJECTED") {
      return errorResponse(`Return is already ${returnReq.status.toLowerCase()}. Cannot change.`, 422);
    }

    // Valid forward transitions
    const validForward = {
      PENDING: ["APPROVED", "REJECTED"],
      APPROVED: ["COMPLETED", "PICKED_UP", "INSPECTING"],
      PICKED_UP: ["INSPECTING", "COMPLETED"],
      INSPECTING: ["COMPLETED"],
    };

    const allowedForward = validForward[returnReq.status] || [];

    // Allow reverting APPROVED → PENDING (undo)
    const isRevert = status === "PENDING" && returnReq.status === "APPROVED";

    // Check if transition is allowed
    if (!isRevert && !allowedForward.includes(status)) {
      return errorResponse(
        `Cannot change from ${returnReq.status} to ${status}. Allowed: ${allowedForward.join(", ") || "none"}${returnReq.status === "APPROVED" ? " or revert to PENDING" : ""}`,
        422
      );
    }

    const data = { status };

    if (status === "APPROVED") {
      data.approvedBy = session.userId;
      data.approvedAt = new Date();
      if (refundAmount) data.refundAmount = refundAmount;
    }

    if (status === "PENDING" && isRevert) {
      data.approvedBy = null;
      data.approvedAt = null;
    }

    if (status === "COMPLETED") {
      data.completedAt = new Date();
      data.refundStatus = "PROCESSED";
    }

    await prisma.returnRequest.update({ where: { id }, data });

    // Create refund transaction on completion
    if (status === "COMPLETED" && returnReq.refundAmount) {
      const existingRefund = await prisma.refundTransaction.findUnique({
        where: { returnRequestId: id },
      });

      if (!existingRefund) {
        await prisma.refundTransaction.create({
          data: {
            returnRequestId: id,
            amount: returnReq.refundAmount,
            status: "SUCCESS",
            processedAt: new Date(),
          },
        });
      }

      // Return stock to inventory
      const order = await prisma.order.findUnique({ where: { id: returnReq.orderId } });
      if (order) {
        const inventory = await prisma.warehouseInventory.findFirst({
          where: { productId: order.productId },
        });
        if (inventory) {
          await prisma.warehouseInventory.update({
            where: { id: inventory.id },
            data: { availableQty: inventory.availableQty + order.quantity },
          });
        }
      }
    }

    // If reverting from APPROVED to PENDING, remove refund transaction if exists
    if (isRevert) {
      await prisma.refundTransaction.deleteMany({
        where: { returnRequestId: id },
      });
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: `RETURN_${status}`,
        entity: "ReturnRequest",
        entityId: id,
        oldValue: { status: returnReq.status },
        newValue: { status },
      },
    });

    // ─── SEND RETURN STATUS NOTIFICATION ───
    try {
      const buyerId = returnReq.buyerId;
      const statusMessages = {
        APPROVED: { title: '✅ Return Approved', message: `Your return request has been approved. Refund of ₹${(returnReq.refundAmount || 0).toLocaleString('en-IN')} will be processed.` },
        REJECTED: { title: '❌ Return Rejected', message: 'Your return request has been rejected. Please contact support for details.' },
        COMPLETED: { title: '🎉 Return Completed', message: `Your return has been processed. Refund of ₹${(returnReq.refundAmount || 0).toLocaleString('en-IN')} has been credited.` },
      };

      const msg = statusMessages[status];
      if (msg && buyerId) {
        NotificationService.send({
          userId: buyerId,
          type: 'IN_APP',
          title: msg.title,
          message: msg.message,
        }).catch(() => {});
      }
    } catch (notifErr) {
      console.error('Return notification error:', notifErr.message);
    }

    return successResponse({
      message: isRevert ? "Return reverted to pending" : `Return ${status.toLowerCase()}`,
      previousStatus: returnReq.status,
      newStatus: status,
      isRevert,
    });
  } catch (error) {
    console.error("Return update error:", error);
    return errorResponse("Failed to update return", 500);
  }
}