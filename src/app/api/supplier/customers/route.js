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
      include: { buyer: { select: { id: true, name: true, email: true } } },
    });

    // Group by buyer
    const customerMap = {};
    for (const order of orders) {
      const buyer = order.buyer;
      if (!customerMap[buyer.id]) {
        customerMap[buyer.id] = {
          id: buyer.id,
          name: buyer.name,
          email: buyer.email,
          totalSpent: 0,
          _count: { orders: 0 },
          lastOrder: null,
        };
      }
      customerMap[buyer.id].totalSpent += order.totalAmount;
      customerMap[buyer.id]._count.orders += 1;
      if (!customerMap[buyer.id].lastOrder || order.createdAt > customerMap[buyer.id].lastOrder) {
        customerMap[buyer.id].lastOrder = order.createdAt;
      }
    }

    return successResponse(Object.values(customerMap));
  } catch (error) {
    console.error("Customers error:", error);
    return errorResponse("Failed to fetch customers", 500);
  }
}