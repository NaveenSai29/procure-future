import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

export async function GET(req) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { id: { contains: search } },
        { buyer: { name: { contains: search } } },
        { product: { name: { contains: search } } },
        { product: { supplier: { businessName: { contains: search } } } },
      ];
    }

    const [orders, total, stats] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          buyer: { select: { id: true, name: true, email: true } },
          product: {
            select: {
              id: true,
              name: true,
              supplier: { select: { id: true, businessName: true } },
            },
          },
          delivery: { select: { id: true, status: true, partner: { select: { id: true, user: { select: { name: true } } } } } },
          statusHistory: { orderBy: { createdAt: "desc" }, take: 1, select: { notes: true, toStatus: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
      prisma.$transaction([
        prisma.order.count({ where: { status: "PENDING" } }),
        prisma.order.count({ where: { status: "CONFIRMED" } }),
        prisma.order.count({ where: { status: "PROCESSING" } }),
        prisma.order.count({ where: { status: "SHIPPED" } }),
        prisma.order.count({ where: { status: "DELIVERED" } }),
        prisma.order.count({ where: { status: "CANCELLED" } }),
        prisma.order.count({ where: { status: "DECLINED" } }),
        prisma.order.count({ where: { status: "RETURNED" } }),
        prisma.order.count({ where: { status: "EXPIRED" } }),
      ]),
    ]);

    return successResponse({
      orders,
      stats: {
        pending: stats[0],
        confirmed: stats[1],
        processing: stats[2],
        shipped: stats[3],
        delivered: stats[4],
        cancelled: stats[5],
        declined: stats[6],
        returned: stats[7],
        expired: stats[8],
        total,
      },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Admin orders error:", error);
    return errorResponse("Failed to fetch orders", 500);
  }
}

export async function PATCH(req) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const body = await req.json();
    const { orderIds, status, orderId, action } = body;

    // ─── Single Order Cancel (Manual Admin Cancel) ───
    if (action === 'cancel' && orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, status: true, buyerId: true, totalAmount: true, paymentMethod: true, razorpayPaymentId: true, walletDeduction: true },
      });
      if (!order) return errorResponse("Order not found", 404);
      if (['DELIVERED', 'CANCELLED', 'DECLINED', 'EXPIRED'].includes(order.status)) {
        return errorResponse(`Cannot cancel order in ${order.status} status`, 422);
      }

      const updated = await prisma.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });

      await prisma.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: 'CANCELLED',
          changedBy: session.userId,
          notes: 'Cancelled by admin',
        },
      });

      // Auto-refund for online payments
      if (order.paymentMethod === 'ONLINE' && order.razorpayPaymentId) {
        try {
          const { RazorpayService } = await import('@/services/razorpay.service');
          await RazorpayService.createRefund({ paymentId: order.razorpayPaymentId });
          await prisma.refundTransaction.create({
            data: { orderId, userId: order.buyerId, amount: order.totalAmount, paymentMethod: 'RAZORPAY', transactionId: order.razorpayPaymentId, status: 'PROCESSED', processedAt: new Date() },
          });
        } catch (err) { console.error('Refund error:', err.message); }
      }
      if (order.walletDeduction > 0) {
        const wallet = await prisma.buyerWallet.findUnique({ where: { userId: order.buyerId } });
        if (wallet) {
          await prisma.buyerWallet.update({ where: { id: wallet.id }, data: { balance: wallet.balance + order.walletDeduction } });
        }
      }

      // Resolve any active SLA
      await prisma.orderSLA.updateMany({
        where: { orderId, status: 'ACTIVE' },
        data: { status: 'RESOLVED' },
      });

      return successResponse({ message: 'Order cancelled & refunded' });
    }

    // ─── Bulk Status Update ───
    if (!orderIds || !Array.isArray(orderIds) || !status) {
      return errorResponse("orderIds array and status are required", 400);
    }

    await prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: { status },
    });

    for (const oid of orderIds) {
      await prisma.orderStatusHistory.create({
        data: {
          orderId: oid,
          fromStatus: "PENDING",
          toStatus: status,
          changedBy: session.userId,
        },
      });
    }

    return successResponse({ message: `${orderIds.length} orders updated to ${status}` });
  } catch (error) {
    return errorResponse("Failed to update orders", 500);
  }
}