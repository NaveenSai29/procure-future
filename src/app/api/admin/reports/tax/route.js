// src/app/api/admin/reports/tax/route.js
// PROCURE Tax Report - GST is collected on DELIVERY & PLATFORM FEE only
// Products are sold by suppliers who handle their own GST

import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const admin = await prisma.adminProfile.findFirst({ where: { userId: user.id } });
    if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'this-month';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const supplierId = searchParams.get('supplierId') || '';
    const exportFormat = searchParams.get('export') || '';

    // Calculate date range
    const now = new Date();
    let dateStart, dateEnd;
    if (startDate && endDate) {
      dateStart = new Date(startDate);
      dateEnd = new Date(endDate);
      dateEnd.setHours(23, 59, 59, 999);
    } else {
      switch (period) {
        case 'last-month':
          dateStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          dateEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
          break;
        case 'this-quarter':
          const quarterStart = Math.floor(now.getMonth() / 3) * 3;
          dateStart = new Date(now.getFullYear(), quarterStart, 1);
          dateEnd = new Date(now.getFullYear(), quarterStart + 3, 0, 23, 59, 59, 999);
          break;
        case 'this-year':
          dateStart = new Date(now.getFullYear(), 0, 1);
          dateEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
          break;
        case 'this-month':
        default:
          dateStart = new Date(now.getFullYear(), now.getMonth(), 1);
          dateEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      }
    }

    // Get GST rate from settings (default 5%)
    const gstSetting = await prisma.systemSetting.findFirst({
      where: { category: 'DELIVERY', key: 'gst_percent' },
    });
    const gstPercent = parseFloat(gstSetting?.value) || 5;

    // Build where clause
    const orderWhere = {
      createdAt: { gte: dateStart, lte: dateEnd },
      status: { in: ['DELIVERED', 'COMPLETED', 'SHIPPED'] },
    };
    if (supplierId) {
      orderWhere.product = { supplierId };
    }

    const orders = await prisma.order.findMany({
      where: orderWhere,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            hsnCode: true,
            supplierId: true,
            supplier: { select: { id: true, businessName: true, gstin: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // ===== REAL GST CALCULATION =====
    // Uses actual deliveryFee, platformFee, gstAmount from orders

    let totalProductRevenue = 0;
    let totalDeliveryFee = 0;
    let totalPlatformFee = 0;
    let totalGstCollected = 0;
    const orderCount = orders.length;

    const hsnWiseSummary = {};
    const supplierWiseSummary = {};
    const monthlyMap = {};

    orders.forEach(order => {
      const product = order.product;
      const hsnCode = product?.hsnCode || 'N/A';
      const productAmount = order.totalAmount || 0;
      const deliveryFee = order.deliveryFee || 0;
      const platformFee = order.platformFee || 0;
      const gstAmount = order.gstAmount || 0;

      totalProductRevenue += productAmount;
      totalDeliveryFee += deliveryFee;
      totalPlatformFee += platformFee;
      totalGstCollected += gstAmount;

      // HSN-wise grouping
      if (!hsnWiseSummary[hsnCode]) {
        hsnWiseSummary[hsnCode] = { hsnCode, productCount: 0, productRevenue: 0, orders: 0 };
      }
      hsnWiseSummary[hsnCode].productCount++;
      hsnWiseSummary[hsnCode].productRevenue += productAmount;
      hsnWiseSummary[hsnCode].orders++;

      // Supplier-wise
      const supplier = product?.supplier;
      if (supplier) {
        const sid = supplier.id;
        if (!supplierWiseSummary[sid]) {
          supplierWiseSummary[sid] = {
            supplierId: sid, businessName: supplier.businessName, gstin: supplier.gstin,
            productRevenue: 0, orderCount: 0,
          };
        }
        supplierWiseSummary[sid].productRevenue += productAmount;
        supplierWiseSummary[sid].orderCount++;
      }

      // Monthly breakdown (using YYYY-MM key for cross-year support)
      const orderDate = new Date(order.createdAt);
      const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          month: orderDate.toLocaleString('default', { month: 'short', year: 'numeric' }),
          productRevenue: 0, deliveryFee: 0, platformFee: 0, gstCollected: 0, orderCount: 0,
        };
      }
      monthlyMap[monthKey].productRevenue += productAmount;
      monthlyMap[monthKey].deliveryFee += deliveryFee;
      monthlyMap[monthKey].platformFee += platformFee;
      monthlyMap[monthKey].gstCollected += gstAmount;
      monthlyMap[monthKey].orderCount++;
    });

    const monthlyBreakdown = Object.values(monthlyMap).sort((a, b) => {
      return new Date(a.month) - new Date(b.month);
    });

    // CGST = SGST = half of total GST
    const cgst = Math.round(totalGstCollected / 2 * 100) / 100;
    const sgst = Math.round(totalGstCollected / 2 * 100) / 100;
    const gstOnDelivery = Math.round(totalDeliveryFee * gstPercent / 100 * 100) / 100;
    const gstOnPlatform = Math.round(totalPlatformFee * gstPercent / 100 * 100) / 100;

    const result = {
      note: 'PROCURE collects GST only on delivery & platform fees at ' + gstPercent + '%. Product prices are set by suppliers who handle their own GST.',
      period: { startDate: dateStart.toISOString(), endDate: dateEnd.toISOString(), label: period },
      summary: {
        productRevenue: Math.round(totalProductRevenue * 100) / 100,
        totalDeliveryFee: Math.round(totalDeliveryFee * 100) / 100,
        totalPlatformFee: Math.round(totalPlatformFee * 100) / 100,
        gstOnDelivery,
        gstOnPlatform,
        totalGstCollected: Math.round(totalGstCollected * 100) / 100,
        cgst,
        sgst,
        gstPercent,
        orderCount,
      },
      hsnWise: Object.values(hsnWiseSummary)
        .map(h => ({ ...h, productRevenue: Math.round(h.productRevenue * 100) / 100 }))
        .sort((a, b) => b.productRevenue - a.productRevenue),
      supplierWise: Object.values(supplierWiseSummary)
        .map(s => ({ ...s, productRevenue: Math.round(s.productRevenue * 100) / 100 })),
      monthlyBreakdown: monthlyBreakdown.map(m => ({
        ...m,
        productRevenue: Math.round(m.productRevenue * 100) / 100,
        deliveryFee: Math.round(m.deliveryFee * 100) / 100,
        platformFee: Math.round(m.platformFee * 100) / 100,
        gstCollected: Math.round(m.gstCollected * 100) / 100,
      })),
    };

    // Export as CSV
    if (exportFormat === 'csv') {
      const rows = [
        ['PROCURE Tax Report - GST on Delivery & Platform Fee Only (' + gstPercent + '%)'],
        ['Period', dateStart.toISOString().split('T')[0], 'to', dateEnd.toISOString().split('T')[0]],
        [],
        ['SUMMARY'],
        ['Product Revenue', 'Delivery Fee', 'Platform Fee', 'GST on Delivery', 'GST on Platform', 'Total GST', 'CGST', 'SGST', 'Orders'],
        [result.summary.productRevenue, result.summary.totalDeliveryFee, result.summary.totalPlatformFee, result.summary.gstOnDelivery, result.summary.gstOnPlatform, result.summary.totalGstCollected, result.summary.cgst, result.summary.sgst, result.summary.orderCount],
        [],
        ['MONTHLY BREAKDOWN'],
        ['Month', 'Product Revenue', 'Delivery Fee', 'Platform Fee', 'GST Collected', 'Orders'],
      ];
      result.monthlyBreakdown.forEach(m => rows.push([m.month, m.productRevenue, m.deliveryFee, m.platformFee, m.gstCollected, m.orderCount]));
      rows.push([]);
      rows.push(['HSN-WISE PRODUCT CLASSIFICATION (Reference Only)']);
      rows.push(['HSN Code', 'Product Revenue', 'Orders']);
      result.hsnWise.forEach(h => rows.push([h.hsnCode, h.productRevenue, h.orders]));
      rows.push([]);
      rows.push(['SUPPLIER-WISE REVENUE']);
      rows.push(['Supplier', 'GSTIN', 'Product Revenue', 'Orders']);
      result.supplierWise.forEach(s => rows.push([s.businessName, s.gstin, s.productRevenue, s.orderCount]));

      const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=tax-report-${dateStart.toISOString().split('T')[0]}.csv`,
        },
      });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Tax Report Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}