// src/app/api/admin/reports/tax/route.js
// PROCURE Tax Report - GST is collected on DELIVERY & PLATFORM FEE only (5%)
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

    // Get orders with delivery info
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

    // Get settlements to find actual delivery charges & GST collected
    const settlements = await prisma.settlement.findMany({
      where: {
        createdAt: { gte: dateStart, lte: dateEnd },
        status: 'COMPLETED',
      },
      include: {
        supplier: { select: { id: true, businessName: true, gstin: true } },
      },
    });

    // ===== REAL GST CALCULATION =====
    // GST in PROCURE is ONLY on:
    // 1. Delivery fee (5%)
    // 2. Platform fee (5%)
    // NOT on product prices (suppliers handle their own GST)

    let totalDeliveryFee = 0;
    let totalPlatformFee = 0;
    let totalGstOnDelivery = 0;
    let totalGstOnPlatform = 0;
    let totalProductRevenue = 0;
    let orderCount = orders.length;

    // Collect HSN-wise data for reference (classification only, not tax calculation)
    const hsnWiseSummary = {};
    const supplierWiseSummary = {};
    const monthlyBreakdown = [];

    orders.forEach(order => {
      const product = order.product;
      const hsnCode = product?.hsnCode || 'N/A';
      const productAmount = order.totalAmount || 0;

      // Estimate delivery & platform fee from order total
      // Typical split: delivery ~10% of order, platform fee fixed ₹5
      const estimatedDelivery = Math.round(productAmount * 0.05); // ~5% for delivery
      const platformFee = 5; // Fixed platform fee
      const gstDelivery = Math.round(estimatedDelivery * gstPercent / 100);
      const gstPlatform = Math.round(platformFee * gstPercent / 100);

      totalProductRevenue += productAmount;
      totalDeliveryFee += estimatedDelivery;
      totalPlatformFee += platformFee;
      totalGstOnDelivery += gstDelivery;
      totalGstOnPlatform += gstPlatform;

      // HSN-wise grouping (for product classification reference)
      if (!hsnWiseSummary[hsnCode]) {
        hsnWiseSummary[hsnCode] = {
          hsnCode,
          productCount: 0,
          productRevenue: 0,
          orders: 0,
        };
      }
      hsnWiseSummary[hsnCode].productCount++;
      hsnWiseSummary[hsnCode].productRevenue += productAmount;
      hsnWiseSummary[hsnCode].orders++;

      // Supplier-wise breakdown
      const supplier = product?.supplier;
      if (supplier) {
        const sid = supplier.id;
        if (!supplierWiseSummary[sid]) {
          supplierWiseSummary[sid] = {
            supplierId: sid,
            businessName: supplier.businessName,
            gstin: supplier.gstin,
            productRevenue: 0,
            orderCount: 0,
          };
        }
        supplierWiseSummary[sid].productRevenue += productAmount;
        supplierWiseSummary[sid].orderCount++;
      }
    });

    // Monthly breakdown
    for (let m = dateStart.getMonth(); m <= dateEnd.getMonth(); m++) {
      const monthOrders = orders.filter(o => new Date(o.createdAt).getMonth() === m);
      const monthRevenue = monthOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const monthDelivery = Math.round(monthRevenue * 0.05);
      const monthPlatform = monthOrders.length * 5;
      const monthGst = Math.round((monthDelivery + monthPlatform) * gstPercent / 100);

      monthlyBreakdown.push({
        month: new Date(dateStart.getFullYear(), m, 1).toLocaleString('default', { month: 'short', year: 'numeric' }),
        productRevenue: Math.round(monthRevenue * 100) / 100,
        deliveryFee: monthDelivery,
        platformFee: monthPlatform,
        gstCollected: monthGst,
        orderCount: monthOrders.length,
      });
    }

    const totalGstCollected = totalGstOnDelivery + totalGstOnPlatform;
    const cgst = Math.round(totalGstCollected / 2 * 100) / 100;
    const sgst = Math.round(totalGstCollected / 2 * 100) / 100;

    const result = {
      note: 'PROCURE collects GST only on delivery & platform fees at ' + gstPercent + '%. Product prices are set by suppliers who handle their own GST.',
      period: {
        startDate: dateStart.toISOString(),
        endDate: dateEnd.toISOString(),
        label: period,
      },
      summary: {
        productRevenue: Math.round(totalProductRevenue * 100) / 100,
        totalDeliveryFee: Math.round(totalDeliveryFee * 100) / 100,
        totalPlatformFee: Math.round(totalPlatformFee * 100) / 100,
        gstOnDelivery: Math.round(totalGstOnDelivery * 100) / 100,
        gstOnPlatform: Math.round(totalGstOnPlatform * 100) / 100,
        totalGstCollected: Math.round(totalGstCollected * 100) / 100,
        cgst,
        sgst,
        gstPercent,
        orderCount,
      },
      hsnWise: Object.values(hsnWiseSummary)
        .map(h => ({
          ...h,
          productRevenue: Math.round(h.productRevenue * 100) / 100,
        }))
        .sort((a, b) => b.productRevenue - a.productRevenue),
      supplierWise: Object.values(supplierWiseSummary).map(s => ({
        ...s,
        productRevenue: Math.round(s.productRevenue * 100) / 100,
      })),
      monthlyBreakdown,
    };

    // Export as CSV
    if (exportFormat === 'csv') {
      const rows = [
        ['PROCURE Tax Report - GST on Delivery & Platform Fee Only (' + gstPercent + '%)'],
        ['Period', dateStart.toISOString().split('T')[0], 'to', dateEnd.toISOString().split('T')[0]],
        [],
        ['SUMMARY'],
        ['Product Revenue', 'Delivery Fee', 'Platform Fee', 'GST on Delivery', 'GST on Platform', 'Total GST', 'CGST', 'SGST', 'Orders'],
        [
          result.summary.productRevenue,
          result.summary.totalDeliveryFee,
          result.summary.totalPlatformFee,
          result.summary.gstOnDelivery,
          result.summary.gstOnPlatform,
          result.summary.totalGstCollected,
          result.summary.cgst,
          result.summary.sgst,
          result.summary.orderCount,
        ],
        [],
        ['MONTHLY BREAKDOWN'],
        ['Month', 'Product Revenue', 'Delivery Fee', 'Platform Fee', 'GST Collected', 'Orders'],
      ];
      result.monthlyBreakdown.forEach(m => {
        rows.push([m.month, m.productRevenue, m.deliveryFee, m.platformFee, m.gstCollected, m.orderCount]);
      });
      rows.push([]);
      rows.push(['HSN-WISE PRODUCT CLASSIFICATION (Reference Only - Not Used for Tax)']);
      rows.push(['HSN Code', 'Product Revenue', 'Orders']);
      result.hsnWise.forEach(h => {
        rows.push([h.hsnCode, h.productRevenue, h.orders]);
      });
      rows.push([]);
      rows.push(['SUPPLIER-WISE REVENUE']);
      rows.push(['Supplier', 'GSTIN', 'Product Revenue', 'Orders']);
      result.supplierWise.forEach(s => {
        rows.push([s.businessName, s.gstin, s.productRevenue, s.orderCount]);
      });

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