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
    const type = searchParams.get('type') || 'list';
    const status = searchParams.get('status') || 'ALL';
    const method = searchParams.get('method') || 'ALL';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');
    const page = parseInt(searchParams.get('page') || '1');

    // Date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
    }

    // Payment method filter
    const methodFilter = {};
    if (method !== 'ALL') {
      methodFilter.paymentMethod = method;
    }

    if (type === 'stats') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const thisWeek = new Date(today);
      thisWeek.setDate(thisWeek.getDate() - 7);

      const [
        totalPaidOrders,
        totalPaidAmount,
        todayOrders,
        todayAmount,
        weeklyAmount,
        monthlyAmount,
        codOrders,
        codAmount,
        onlineOrders,
        onlineAmount,
        refundedAmount,
        methodBreakdown,
      ] = await Promise.all([
        prisma.order.count({ where: { razorpayPaymentId: { not: null } } }),
        prisma.order.aggregate({ where: { razorpayPaymentId: { not: null } }, _sum: { totalAmount: true } }),
        prisma.order.count({ where: { ...dateFilter, createdAt: { gte: today }, razorpayPaymentId: { not: null } } }),
        prisma.order.aggregate({ where: { createdAt: { gte: today }, razorpayPaymentId: { not: null } }, _sum: { totalAmount: true } }),
        prisma.order.aggregate({ where: { createdAt: { gte: thisWeek }, razorpayPaymentId: { not: null } }, _sum: { totalAmount: true } }),
        prisma.order.aggregate({ where: { createdAt: { gte: thisMonth }, razorpayPaymentId: { not: null } }, _sum: { totalAmount: true } }),
        prisma.order.count({ where: { paymentMethod: 'COD' } }),
        prisma.order.aggregate({ where: { paymentMethod: 'COD' }, _sum: { totalAmount: true } }),
        prisma.order.count({ where: { paymentMethod: 'ONLINE' } }),
        prisma.order.aggregate({ where: { paymentMethod: 'ONLINE' }, _sum: { totalAmount: true } }),
        prisma.refundTransaction.aggregate({ where: { status: 'SUCCESS' }, _sum: { amount: true } }),
        prisma.order.groupBy({ by: ['paymentMethod'], _count: true, _sum: { totalAmount: true } }),
      ]);

      return NextResponse.json({
        totalPayments: totalPaidOrders,
        totalRevenue: totalPaidAmount._sum?.totalAmount || 0,
        todayPayments: todayOrders,
        todayAmount: todayAmount._sum?.totalAmount || 0,
        weeklyAmount: weeklyAmount._sum?.totalAmount || 0,
        monthlyAmount: monthlyAmount._sum?.totalAmount || 0,
        codOrders: codOrders,
        codAmount: codAmount._sum?.totalAmount || 0,
        onlineOrders: onlineOrders,
        onlineAmount: onlineAmount._sum?.totalAmount || 0,
        refundedAmount: refundedAmount._sum?.amount || 0,
        methodBreakdown: methodBreakdown.map(m => ({
          method: m.paymentMethod,
          count: m._count,
          amount: m._sum?.totalAmount || 0,
        })),
      });
    }

    // Build where clause for payments list
    const where = { 
      razorpayPaymentId: { not: null },
      ...dateFilter,
      ...methodFilter,
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          id: true,
          totalAmount: true,
          deliveryFee: true,
          paymentMethod: true,
          razorpayPaymentId: true,
          paymentDetails: true,
          status: true,
          walletDeduction: true,
          createdAt: true,
          buyer: { select: { id: true, name: true, email: true, mobile: true } },
          product: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    const payments = orders.map(order => ({
      id: order.id,
      orderId: order.id,
      paymentId: order.razorpayPaymentId,
      amount: order.totalAmount,
      deliveryFee: order.deliveryFee,
      method: order.paymentMethod === 'ONLINE' 
        ? (order.paymentDetails?.method || 'Online')
        : 'COD',
      methodDetail: order.paymentDetails?.method || null,
      bank: order.paymentDetails?.bank || null,
      wallet: order.paymentDetails?.wallet || null,
      vpa: order.paymentDetails?.vpa || null,
      walletDeduction: order.walletDeduction || 0,
      status: order.status === 'DELIVERED' || order.status === 'COMPLETED' ? 'captured' : 
              order.status === 'CANCELLED' ? 'refunded' : 'captured',
      buyerName: order.buyer?.name || 'Unknown',
      buyerEmail: order.buyer?.email || null,
      buyerMobile: order.buyer?.mobile || null,
      productName: order.product?.name || 'N/A',
      createdAt: order.createdAt,
    }));

    return NextResponse.json({ 
      payments, 
      total, 
      page, 
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Admin payments error:', error);
    return NextResponse.json({ payments: [], total: 0, error: error.message }, { status: 500 });
  }
}