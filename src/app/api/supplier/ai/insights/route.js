// src/app/api/supplier/ai/insights/route.js

import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

async function getSupplierId(userId) {
  const staff = await prisma.supplierStaff.findFirst({ where: { userId } });
  if (staff) return staff.supplierId;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (user) {
    const supplier = await prisma.supplier.findFirst({ where: { email: user.email } });
    if (supplier) return supplier.id;
  }
  return null;
}

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const supplierId = await getSupplierId(session.userId);
    if (!supplierId) return errorResponse("Supplier not found", 403);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    const [
      productCount, activeProducts, pendingApproval,
      totalOrders, thisMonthOrders, lastMonthOrders,
      totalRevenue, thisMonthRevenue, lastMonthRevenue,
      warehouseCount, totalStock, lowStockProducts,
      topProducts, recentOrders, inventoryAlerts,
      pendingReturns, openRFQs,
    ] = await Promise.all([
      prisma.product.count({ where: { supplierId } }),
      prisma.product.count({ where: { supplierId, isActive: true, isApproved: true } }),
      prisma.product.count({ where: { supplierId, isApproved: false } }),
      prisma.order.count({ where: { product: { supplierId } } }),
      prisma.order.count({ where: { product: { supplierId }, createdAt: { gte: thisMonth } } }),
      prisma.order.count({ where: { product: { supplierId }, createdAt: { gte: lastMonth, lt: thisMonth } } }),
      prisma.order.aggregate({ where: { product: { supplierId }, status: "DELIVERED" }, _sum: { totalAmount: true } }),
      prisma.order.aggregate({ where: { product: { supplierId }, createdAt: { gte: thisMonth }, status: "DELIVERED" }, _sum: { totalAmount: true } }),
      prisma.order.aggregate({ where: { product: { supplierId }, createdAt: { gte: lastMonth, lt: thisMonth }, status: "DELIVERED" }, _sum: { totalAmount: true } }),
      prisma.warehouse.count({ where: { supplierId } }),
      prisma.warehouseInventory.aggregate({ where: { warehouse: { supplierId } }, _sum: { availableQty: true } }),
      prisma.warehouseInventory.count({ where: { warehouse: { supplierId }, availableQty: { lte: 5 } } }),
      prisma.product.findMany({ where: { supplierId, isActive: true }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, createdAt: true } }),
      prisma.order.findMany({ where: { product: { supplierId } }, orderBy: { createdAt: "desc" }, take: 5, include: { buyer: { select: { name: true } }, product: { select: { name: true } } } }),
      prisma.warehouseInventory.findMany({ where: { warehouse: { supplierId }, availableQty: { lte: 10 } }, include: { product: { select: { id: true, name: true } }, warehouse: { select: { name: true } } }, take: 5 }),
      prisma.returnRequest.count({ where: { supplierId, status: "PENDING" } }),
      prisma.rFQ.count({ where: { status: "PUBLISHED" } }),
    ]);

    const insights = [];
    const alerts = [];
    const suggestions = [];

    const revThisMonth = thisMonthRevenue._sum?.totalAmount || 0;
    const revLastMonth = lastMonthRevenue._sum?.totalAmount || 0;

    // Order trend
    if (thisMonthOrders > 0 && lastMonthOrders > 0) {
      const orderGrowth = ((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100;
      if (orderGrowth > 20) insights.push({ type: "positive", message: `Orders up ${Math.round(orderGrowth)}% this month` });
      else if (orderGrowth < -10) insights.push({ type: "negative", message: `Orders down ${Math.round(Math.abs(orderGrowth))}% this month` });
      else insights.push({ type: "neutral", message: "Order volume is stable compared to last month" });
    } else if (thisMonthOrders > 0) {
      insights.push({ type: "positive", message: `First ${thisMonthOrders} orders this month - great start!` });
    } else {
      insights.push({ type: "neutral", message: "No orders yet this month - products are live and ready" });
    }

    // Revenue trend
    if (revThisMonth > 0 && revLastMonth > 0) {
      const revenueGrowth = ((revThisMonth - revLastMonth) / revLastMonth) * 100;
      if (revenueGrowth > 15) insights.push({ type: "positive", message: `Revenue up ${Math.round(revenueGrowth)}% vs last month` });
      else if (revenueGrowth < -10) insights.push({ type: "negative", message: `Revenue down ${Math.round(Math.abs(revenueGrowth))}% vs last month` });
    } else if (revThisMonth > 0) {
      insights.push({ type: "positive", message: `Revenue of ₹${revThisMonth.toLocaleString('en-IN')} earned this month` });
    }

    // Product health
    if (pendingApproval > 0) alerts.push({ type: "warning", message: `${pendingApproval} product${pendingApproval > 1 ? 's' : ''} pending admin approval` });
    if (activeProducts === 0) alerts.push({ type: "warning", message: "No active products - add products to start selling" });
    if (totalOrders === 0 && activeProducts > 0) alerts.push({ type: "info", message: "Products are live but no orders yet - optimize pricing and descriptions" });

    // Inventory health
    if (lowStockProducts > 0) alerts.push({ type: "warning", message: `${lowStockProducts} product${lowStockProducts > 1 ? 's' : ''} running low on stock` });
    if (totalStock._sum?.availableQty === 0 || !totalStock._sum?.availableQty) {
      if (activeProducts > 0) alerts.push({ type: "info", message: "Add stock to your warehouses for active products" });
    }

    // Returns
    if (pendingReturns > 0) alerts.push({ type: "warning", message: `${pendingReturns} pending return request${pendingReturns > 1 ? 's' : ''}` });

    // Suggestions
    if (activeProducts < 5 && activeProducts > 0) suggestions.push(`You have ${activeProducts} products - add more to increase visibility`);
    if (activeProducts === 0) suggestions.push("Add your first product to start receiving orders");
    if (warehouseCount === 0) suggestions.push("Create a warehouse to manage your inventory and enable deliveries");
    if (activeProducts > 0 && totalOrders > 0 && thisMonthOrders === 0) suggestions.push("No orders this month - try running promotions or adjusting prices");
    if (inventoryAlerts.length > 0) suggestions.push(`${inventoryAlerts.length} product${inventoryAlerts.length > 1 ? 's' : ''} need restocking soon - check inventory`);
    if (openRFQs > 0) suggestions.push(`Respond to ${openRFQs} open RFQ${openRFQs > 1 ? 's' : ''} for new business opportunities`);
    suggestions.push("Keep product descriptions detailed with keywords for better search visibility");

    // Calculate growth safely
    const orderGrowth = lastMonthOrders > 0 ? Math.round(((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100) : (thisMonthOrders > 0 ? 100 : 0);
    const revenueGrowth = revLastMonth > 0 ? Math.round(((revThisMonth - revLastMonth) / revLastMonth) * 100) : (revThisMonth > 0 ? 100 : 0);

    return successResponse({
      overview: {
        totalProducts: productCount,
        activeProducts,
        pendingApproval,
        totalOrders,
        ordersThisMonth: thisMonthOrders,
        ordersLastMonth: lastMonthOrders,
        orderGrowth,
        totalRevenue: totalRevenue._sum?.totalAmount || 0,
        revenueThisMonth: revThisMonth,
        revenueGrowth,
        totalStock: totalStock._sum?.availableQty || 0,
        lowStockProducts,
        hasActivity: totalOrders > 0,
      },
      insights,
      alerts,
      suggestions,
      topProducts,
      recentOrders,
      inventoryAlerts: inventoryAlerts.map(i => ({ product: i.product.name, warehouse: i.warehouse.name, qty: i.availableQty })),
      pendingReturns,
      openRFQs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("AI Insights error:", error);
    return errorResponse("Failed to generate insights", 500);
  }
}