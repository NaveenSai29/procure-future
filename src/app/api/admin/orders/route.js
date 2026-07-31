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
        total,
      },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Admin orders error:", error);
    return errorResponse("Failed to fetch orders", 500);
  }
}

// PATCH - Bulk status update
export async function PATCH(req) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const body = await req.json();
    const { orderIds, status } = body;

    if (!orderIds || !Array.isArray(orderIds) || !status) {
      return errorResponse("orderIds array and status are required", 400);
    }

    await prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: { status },
    });

    // Create status history entries
    for (const orderId of orderIds) {
      await prisma.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: "PENDING",
          toStatus: status,
          changedBy: session.userId,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "ORDER_BULK_STATUS",
        entity: "Order",
        newValue: { count: orderIds.length, status },
      },
    });

    return successResponse({ message: `${orderIds.length} orders updated to ${status}` });
  } catch (error) {
    return errorResponse("Failed to update orders", 500);
  }
}