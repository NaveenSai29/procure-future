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

    // Top products (by order count)
    const topProducts = await prisma.order.groupBy({
      by: ['productId'],
      where: {
        product: { supplierId },
        status: 'DELIVERED',
      },
      _count: { productId: true },
      _sum: { totalAmount: true },
      orderBy: { _count: { productId: 'desc' } },
      take: 5,
    });

    // Get product names for top products
    const topProductIds = topProducts.map(tp => tp.productId);
    const topProductDetails = await prisma.product.findMany({
      where: { id: { in: topProductIds } },
      select: { id: true, name: true },
    });

    const topProductsWithNames = topProducts.map(tp => ({
      productId: tp.productId,
      name: topProductDetails.find(p => p.id === tp.productId)?.name || 'Unknown',
      orderCount: tp._count.productId,
      totalRevenue: tp._sum.totalAmount || 0,
    }));

    // Revenue trend (last 7 days)
    const revenueTrend = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayRevenue = await prisma.order.aggregate({
        where: {
          product: { supplierId },
          status: 'DELIVERED',
          createdAt: { gte: dayStart, lt: dayEnd },
        },
        _sum: { totalAmount: true },
      });

      revenueTrend.push({
        date: dayStart.toLocaleDateString('en-IN', { weekday: 'short' }),
        revenue: dayRevenue._sum.totalAmount || 0,
      });
    }

    return successResponse({
      todayOrders,
      activeProducts,
      totalInventory: inventory._sum.availableQty || 0,
      monthlyRevenue: monthlyRevenue._sum.totalAmount || 0,
      recentOrders,
      lowStockProducts: [],
      topProducts: topProductsWithNames,
      revenueTrend,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return errorResponse("Failed to fetch stats", 500);
  }
}