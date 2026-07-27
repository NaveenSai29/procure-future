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

    const supplierId = staff.supplierId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayOrders, activeProducts, inventory, monthlyRevenue, recentOrders, lowStock] = await Promise.all([
      prisma.order.count({
        where: {
          product: { supplierId },
          createdAt: { gte: today },
        },
      }),
      prisma.product.count({
        where: { supplierId, isActive: true, isApproved: true },
      }),
      prisma.warehouseInventory.aggregate({
        where: { warehouse: { supplierId } },
        _sum: { availableQty: true },
      }),
      prisma.order.aggregate({
        where: {
          product: { supplierId },
          status: "DELIVERED",
          createdAt: { gte: new Date(today.getFullYear(), today.getMonth(), 1) },
        },
        _sum: { totalAmount: true },
      }),
      prisma.order.findMany({
        where: { product: { supplierId } },
        include: {
          product: { select: { name: true } },
          buyer: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.product.findMany({
        where: { supplierId, isActive: true },
        include: {
          inventory: {
            where: { availableQty: { lte: prisma.product.fields?.minStockLevel || 10 } },
            take: 1,
          },
        },
        take: 3,
      }),
    ]);

    return successResponse({
      todayOrders,
      activeProducts,
      totalInventory: inventory._sum.availableQty || 0,
      monthlyRevenue: monthlyRevenue._sum.totalAmount || 0,
      recentOrders,
      lowStockProducts: [],
    });
  } catch (error) {
    console.error("Stats error:", error);
    return errorResponse("Failed to fetch stats", 500);
  }
}