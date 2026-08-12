import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const staff = await prisma.supplierStaff.findFirst({
      where: { userId: session.userId },
    });
    if (!staff) return errorResponse("Not a supplier", 403);

    const orders = await prisma.order.findMany({
      where: { product: { supplierId: staff.supplierId } },
      include: {
        buyer: {
          select: { id: true, name: true },
        },
      },
    });

    // Group by buyer
    const customerMap = {};
    for (const order of orders) {
      const buyer = order.buyer;
      if (!customerMap[buyer.id]) {
        // Hide fake @procure emails
        const isRealEmail = buyer.email && !buyer.email.includes('@procure.');
        customerMap[buyer.id] = {
          id: buyer.id,
          name: buyer.name?.split(' ')[0] || buyer.name, // First name only
          totalSpent: 0,
          totalOrders: 0,
          _count: { orders: 0 },
          lastOrder: null,
          firstOrder: null,
          orders: [],
        };
      }
      customerMap[buyer.id].totalSpent += order.totalAmount;
      customerMap[buyer.id].totalOrders += 1;
      customerMap[buyer.id]._count.orders += 1;
      customerMap[buyer.id].orders.push({
        id: order.id,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt,
      });
      if (!customerMap[buyer.id].lastOrder || order.createdAt > customerMap[buyer.id].lastOrder) {
        customerMap[buyer.id].lastOrder = order.createdAt;
      }
      if (!customerMap[buyer.id].firstOrder || order.createdAt < customerMap[buyer.id].firstOrder) {
        customerMap[buyer.id].firstOrder = order.createdAt;
      }
    }

    // Sort by last order date (most recent first)
    const customers = Object.values(customerMap).sort((a, b) => {
      if (!a.lastOrder) return 1;
      if (!b.lastOrder) return -1;
      return new Date(b.lastOrder) - new Date(a.lastOrder);
    });

    return successResponse(customers);
  } catch (error) {
    console.error("Customers error:", error);
    return errorResponse("Failed to fetch customers", 500);
  }
}