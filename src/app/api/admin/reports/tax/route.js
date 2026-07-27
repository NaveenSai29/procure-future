// src/app/api/admin/reports/tax/route.js

import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Tax reports with filters
export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const admin = await prisma.adminProfile.findFirst({ where: { userId: user.id } });
    if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'summary'; // summary, hsn-wise, supplier-wise, gstr1
    const period = searchParams.get('period') || 'this-month'; // this-month, last-month, this-quarter, this-year, custom
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const supplierId = searchParams.get('supplierId') || '';
    const hsnChapter = searchParams.get('hsnChapter') || '';
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

    // Base where clause for orders
    const orderWhere = {
      createdAt: { gte: dateStart, lte: dateEnd },
      status: { in: ['DELIVERED', 'COMPLETED', 'SHIPPED'] },
    };
    if (supplierId) {
      orderWhere.product = { supplierId };
    }

    // Get all orders in date range with product and supplier info
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

    // Get invoices in date range
    const invoiceWhere = {
      createdAt: { gte: dateStart, lte: dateEnd },
      status: { in: ['PAID', 'COMPLETED'] },
    };
    if (supplierId) invoiceWhere.supplierId = supplierId;

    const invoices = await prisma.invoice.findMany({
      where: invoiceWhere,
      include: {
        items: true,
        supplier: { select: { id: true, businessName: true, gstin: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Get HSN code master data for lookup
    const hsnCodes = await prisma.hsnCode.findMany({
      where: { isActive: true },
    });
    const hsnMap = {};
    hsnCodes.forEach(h => { hsnMap[h.code] = h; });

    // ===== TAX SUMMARY =====
    // Calculate from orders (each order has a single product)
    let totalTaxableValue = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalCess = 0;
    let orderCount = orders.length;

    // Group by GST rate
    const rateWiseSummary = {};
    const hsnWiseSummary = {};

    orders.forEach(order => {
      const product = order.product;
      const hsnCode = product?.hsnCode || 'N/A';
      const hsnData = hsnMap[hsnCode];
      const gstRate = hsnData?.gstRate || 18;
      const cess = hsnData?.cess || 0;
      
      // Assuming totalAmount includes tax, we reverse-calculate
      const taxableValue = order.totalAmount / (1 + (gstRate + cess) / 100);
      const taxAmount = order.totalAmount - taxableValue;
      const cgstAmount = taxAmount / 2;
      const sgstAmount = taxAmount / 2;
      const cessAmount = taxableValue * (cess / 100);

      totalTaxableValue += taxableValue;
      totalCgst += cgstAmount;
      totalSgst += sgstAmount;
      totalCess += cessAmount;

      // Rate-wise grouping
      const rateKey = `${gstRate}%`;
      if (!rateWiseSummary[rateKey]) {
        rateWiseSummary[rateKey] = { rate: gstRate, taxableValue: 0, taxAmount: 0, cess: 0, count: 0 };
      }
      rateWiseSummary[rateKey].taxableValue += taxableValue;
      rateWiseSummary[rateKey].taxAmount += taxAmount;
      rateWiseSummary[rateKey].cess += cessAmount;
      rateWiseSummary[rateKey].count++;

      // HSN-wise grouping
      if (!hsnWiseSummary[hsnCode]) {
        hsnWiseSummary[hsnCode] = {
          hsnCode,
          description: hsnData?.description || 'Unknown',
          chapter: hsnData?.chapter || hsnCode.substring(0, 2),
          section: hsnData?.section || 'Uncategorized',
          gstRate,
          taxableValue: 0,
          taxAmount: 0,
          cess: 0,
          count: 0,
        };
      }
      hsnWiseSummary[hsnCode].taxableValue += taxableValue;
      hsnWiseSummary[hsnCode].taxAmount += taxAmount;
      hsnWiseSummary[hsnCode].cess += cessAmount;
      hsnWiseSummary[hsnCode].count++;
    });

    // Also include invoice data for more accurate tax
    invoices.forEach(invoice => {
      totalTaxableValue += invoice.amount || 0;
      totalCgst += (invoice.taxAmount || 0) / 2;
      totalSgst += (invoice.taxAmount || 0) / 2;
    });

    const totalTax = totalCgst + totalSgst + totalIgst + totalCess;

    // Supplier-wise breakdown
    const supplierWiseSummary = {};
    orders.forEach(order => {
      const supplier = order.product?.supplier;
      if (!supplier) return;
      const sid = supplier.id;
      if (!supplierWiseSummary[sid]) {
        supplierWiseSummary[sid] = {
          supplierId: sid,
          businessName: supplier.businessName,
          gstin: supplier.gstin,
          taxableValue: 0,
          taxAmount: 0,
          orderCount: 0,
        };
      }
      const product = order.product;
      const hsnCode = product?.hsnCode || 'N/A';
      const hsnData = hsnMap[hsnCode];
      const gstRate = hsnData?.gstRate || 18;
      const taxableValue = order.totalAmount / (1 + gstRate / 100);
      const taxAmount = order.totalAmount - taxableValue;
      supplierWiseSummary[sid].taxableValue += taxableValue;
      supplierWiseSummary[sid].taxAmount += taxAmount;
      supplierWiseSummary[sid].orderCount++;
    });

    // Monthly breakdown for charts
    const monthlyBreakdown = [];
    for (let m = dateStart.getMonth(); m <= dateEnd.getMonth(); m++) {
      const monthOrders = orders.filter(o => new Date(o.createdAt).getMonth() === m);
      const monthTaxable = monthOrders.reduce((sum, o) => {
        const hsnData = hsnMap[o.product?.hsnCode || ''];
        const rate = hsnData?.gstRate || 18;
        return sum + o.totalAmount / (1 + rate / 100);
      }, 0);
      const monthTax = monthOrders.reduce((sum, o) => {
        const hsnData = hsnMap[o.product?.hsnCode || ''];
        const rate = hsnData?.gstRate || 18;
        const taxable = o.totalAmount / (1 + rate / 100);
        return sum + (o.totalAmount - taxable);
      }, 0);
      monthlyBreakdown.push({
        month: new Date(dateStart.getFullYear(), m, 1).toLocaleString('default', { month: 'short', year: 'numeric' }),
        taxableValue: Math.round(monthTaxable * 100) / 100,
        taxAmount: Math.round(monthTax * 100) / 100,
        orderCount: monthOrders.length,
      });
    }

    const result = {
      period: {
        startDate: dateStart.toISOString(),
        endDate: dateEnd.toISOString(),
        label: period,
      },
      summary: {
        totalTaxableValue: Math.round(totalTaxableValue * 100) / 100,
        totalCgst: Math.round(totalCgst * 100) / 100,
        totalSgst: Math.round(totalSgst * 100) / 100,
        totalIgst: Math.round(totalIgst * 100) / 100,
        totalCess: Math.round(totalCess * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
        totalRevenue: Math.round((totalTaxableValue + totalTax) * 100) / 100,
        orderCount,
        invoiceCount: invoices.length,
      },
      rateWise: Object.values(rateWiseSummary).map(r => ({
        ...r,
        taxableValue: Math.round(r.taxableValue * 100) / 100,
        taxAmount: Math.round(r.taxAmount * 100) / 100,
        cess: Math.round(r.cess * 100) / 100,
      })),
      hsnWise: Object.values(hsnWiseSummary)
        .filter(h => hsnChapter ? h.chapter === hsnChapter : true)
        .map(h => ({
          ...h,
          taxableValue: Math.round(h.taxableValue * 100) / 100,
          taxAmount: Math.round(h.taxAmount * 100) / 100,
          cess: Math.round(h.cess * 100) / 100,
        }))
        .sort((a, b) => b.taxAmount - a.taxAmount),
      supplierWise: Object.values(supplierWiseSummary).map(s => ({
        ...s,
        taxableValue: Math.round(s.taxableValue * 100) / 100,
        taxAmount: Math.round(s.taxAmount * 100) / 100,
      })),
      monthlyBreakdown,
    };

    // Export as CSV if requested
    if (exportFormat === 'csv') {
      const rows = [['HSN Code', 'Description', 'Chapter', 'Section', 'GST Rate', 'Taxable Value', 'Tax Amount', 'Cess', 'Order Count']];
      result.hsnWise.forEach(h => {
        rows.push([h.hsnCode, h.description, h.chapter, h.section, h.gstRate + '%', h.taxableValue, h.taxAmount, h.cess, h.count]);
      });
      rows.push([]);
      rows.push(['Rate-wise Summary']);
      rows.push(['GST Rate', 'Taxable Value', 'Tax Amount', 'Cess', 'Order Count']);
      result.rateWise.forEach(r => rows.push([r.rate + '%', r.taxableValue, r.taxAmount, r.cess, r.count]));
      rows.push([]);
      rows.push(['Supplier-wise Summary']);
      rows.push(['Supplier', 'GSTIN', 'Taxable Value', 'Tax Amount', 'Order Count']);
      result.supplierWise.forEach(s => rows.push([s.businessName, s.gstin, s.taxableValue, s.taxAmount, s.orderCount]));

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