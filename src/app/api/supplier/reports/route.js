import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

// Helper: escape CSV field
function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// GET - Generate report data
export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const staff = await prisma.supplierStaff.findFirst({
      where: { userId: session.userId },
    });
    if (!staff) return errorResponse("Not a supplier", 403);

    const supplierId = staff.supplierId;
    const { searchParams } = new URL(request.url);
    const report = searchParams.get('report') || 'sales';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format') || 'json'; // json or csv

    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    const hasDateFilter = startDate || endDate;

    let csv = '';
    let data = {};

    switch (report) {
      case 'sales': {
        const orders = await prisma.order.findMany({
          where: {
            product: { supplierId },
            ...(hasDateFilter && { createdAt: dateFilter }),
          },
          include: {
            product: { select: { name: true, sku: true } },
            buyer: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        });

        data = { orders, total: orders.length, totalAmount: orders.reduce((s, o) => s + o.totalAmount, 0) };
        csv = 'Order ID,Product,SKU,Buyer,Quantity,Amount,Status,Date\n';
        orders.forEach(o => {
          csv += `${escapeCSV(o.id?.slice(0,8))},${escapeCSV(o.product?.name)},${escapeCSV(o.product?.sku)},${escapeCSV(o.buyer?.name)},${o.quantity},${o.totalAmount},${o.status},${new Date(o.createdAt).toLocaleDateString('en-IN')}\n`;
        });
        break;
      }

      case 'revenue': {
        const orders = await prisma.order.findMany({
          where: {
            product: { supplierId },
            status: { in: ['DELIVERED', 'COMPLETED'] },
            ...(hasDateFilter && { createdAt: dateFilter }),
          },
          select: { totalAmount: true, createdAt: true, deliveryFee: true },
          orderBy: { createdAt: 'desc' },
        });

        const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);
        const totalDelivery = orders.reduce((s, o) => s + o.deliveryFee, 0);
        const monthMap = {};
        orders.forEach(o => {
          const key = new Date(o.createdAt).toLocaleString('en-IN', { month: 'short', year: 'numeric' });
          if (!monthMap[key]) monthMap[key] = { revenue: 0, count: 0 };
          monthMap[key].revenue += o.totalAmount;
          monthMap[key].count += 1;
        });

        data = { totalRevenue, totalDelivery, orderCount: orders.length, monthly: monthMap };
        csv = 'Month,Orders,Revenue\n';
        Object.entries(monthMap).forEach(([month, val]) => {
          csv += `${month},${val.count},${val.revenue}\n`;
        });
        break;
      }

      case 'products': {
        const products = await prisma.product.findMany({
          where: { supplierId },
          select: {
            id: true, name: true, sku: true,
            _count: { select: { orders: true } },
          },
          orderBy: { orders: { _count: 'desc' } },
          take: 100,
        });

        // Get order totals per product
        const productIds = products.map(p => p.id);
        const orderAgg = await prisma.order.groupBy({
          by: ['productId'],
          where: {
            productId: { in: productIds },
            status: { in: ['DELIVERED', 'COMPLETED'] },
            ...(hasDateFilter && { createdAt: dateFilter }),
          },
          _sum: { totalAmount: true },
          _count: true,
        });
        const aggMap = {};
        orderAgg.forEach(a => { aggMap[a.productId] = a; });

        data = {
          products: products.map(p => ({
            ...p,
            orderCount: aggMap[p.id]?._count || 0,
            totalRevenue: aggMap[p.id]?._sum?.totalAmount || 0,
          })),
        };
        csv = 'Product,SKU,Orders,Revenue\n';
        data.products.forEach(p => {
          csv += `${escapeCSV(p.name)},${escapeCSV(p.sku)},${p.orderCount},${p.totalRevenue}\n`;
        });
        break;
      }

      case 'inventory': {
        const inventory = await prisma.warehouseInventory.findMany({
          where: { warehouse: { supplierId } },
          include: {
            product: { select: { name: true, sku: true } },
            warehouse: { select: { name: true } },
          },
          orderBy: { product: { name: 'asc' } },
        });

        data = { inventory, total: inventory.length };
        csv = 'Product,SKU,Warehouse,Available,Reserved,Damaged,Min Stock\n';
        inventory.forEach(i => {
          csv += `${escapeCSV(i.product?.name)},${escapeCSV(i.product?.sku)},${escapeCSV(i.warehouse?.name)},${i.availableQty},${i.reservedQty},${i.damagedQty},${i.minStockLevel}\n`;
        });
        break;
      }

      case 'tax': {
        const orders = await prisma.order.findMany({
          where: {
            product: { supplierId },
            ...(hasDateFilter && { createdAt: dateFilter }),
          },
          select: {
            id: true, totalAmount: true, gstAmount: true, createdAt: true,
            product: { select: { name: true, hsnCode: true } },
          },
          orderBy: { createdAt: 'desc' },
        });

        const totalGST = orders.reduce((s, o) => s + (o.gstAmount || 0), 0);
        const totalAmount = orders.reduce((s, o) => s + o.totalAmount, 0);
        data = { orders, totalGST, totalAmount, orderCount: orders.length };
        csv = 'Order ID,Product,HSN,Amount,GST,Date\n';
        orders.forEach(o => {
          csv += `${escapeCSV(o.id?.slice(0,8))},${escapeCSV(o.product?.name)},${escapeCSV(o.product?.hsnCode)},${o.totalAmount},${o.gstAmount || 0},${new Date(o.createdAt).toLocaleDateString('en-IN')}\n`;
        });
        break;
      }

      case 'returns': {
        const returns = await prisma.returnRequest.findMany({
          where: {
            supplierId,
            ...(hasDateFilter && { createdAt: dateFilter }),
          },
          include: {
            product: { select: { name: true } },
            buyer: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        });

        const totalRefund = returns.reduce((s, r) => s + (r.refundAmount || 0), 0);
        data = { returns, totalRefund, count: returns.length };
        csv = 'Return ID,Product,Buyer,Reason,Status,Refund Amount,Date\n';
        returns.forEach(r => {
          csv += `${escapeCSV(r.id?.slice(0,8))},${escapeCSV(r.product?.name)},${escapeCSV(r.buyer?.name)},${escapeCSV(r.reason)},${r.status},${r.refundAmount || 0},${new Date(r.createdAt).toLocaleDateString('en-IN')}\n`;
        });
        break;
      }

      default:
        return errorResponse("Invalid report type", 400);
    }

    if (format === 'csv') {
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${report}_report.csv"`,
        },
      });
    }

    return successResponse({ report, data, csv });
  } catch (error) {
    console.error("Reports error:", error);
    return errorResponse("Failed to generate report", 500);
  }
}