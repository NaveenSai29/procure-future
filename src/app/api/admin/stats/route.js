import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { roles: { include: { role: true } } },
    });

    const userRoles = user.roles.map((r) => r.role.name);
    if (!userRoles.includes("SUPER_ADMIN") && !userRoles.includes("ADMIN")) {
      return errorResponse("Access denied", 403);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      users, suppliers, products, orders,
      verifiedSuppliers, pendingProducts, activeRFQs, pendingReturns,
      todayOrders, todayRevenue, monthlyRevenue,
      recentOrders, recentUsers, recentSuppliers,
      totalRevenue, pendingSettlements
    ] = await Promise.all([
      prisma.user.count(),
      prisma.supplier.count(),
      prisma.product.count(),
      prisma.order.count(),
      prisma.supplier.count({ where: { isVerified: true } }),
      prisma.product.count({ where: { isApproved: false } }),
      prisma.rFQ.count({ where: { status: 'PUBLISHED' } }),
      prisma.returnRequest.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { createdAt: { gte: today } } }),
      prisma.order.aggregate({ where: { createdAt: { gte: today } }, _sum: { totalAmount: true } }),
      prisma.order.aggregate({ where: { createdAt: { gte: thisMonth } }, _sum: { totalAmount: true } }),
      prisma.order.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { buyer: { select: { name: true } }, product: { select: { name: true } } } }),
      prisma.user.findMany({ where: { createdAt: { gte: thisMonth } }, take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, email: true, createdAt: true } }),
      prisma.supplier.findMany({ where: { createdAt: { gte: thisMonth } }, take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, businessName: true, email: true, createdAt: true } }),
      prisma.order.aggregate({ where: { status: 'DELIVERED' }, _sum: { totalAmount: true } }),
      prisma.settlement.count({ where: { status: 'PENDING' } }),
    ]);

    return successResponse({
      users, suppliers, products, orders,
      verifiedSuppliers, pendingProducts, activeRFQs, pendingReturns, pendingSettlements,
      todayOrders, todayRevenue: todayRevenue._sum?.totalAmount || 0,
      monthlyRevenue: monthlyRevenue._sum?.totalAmount || 0,
      totalRevenue: totalRevenue._sum?.totalAmount || 0,
      recentOrders, recentUsers, recentSuppliers,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return errorResponse("Failed to fetch stats", 500);
  }
}