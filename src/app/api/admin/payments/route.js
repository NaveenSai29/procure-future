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
    const count = parseInt(searchParams.get('count') || '50');

    if (type === 'stats') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const [totalOrders, todayOrders, monthlyRevenue, totalRevenue, successfulPayments] = await Promise.all([
        prisma.order.count(),
        prisma.order.count({ where: { createdAt: { gte: today } } }),
        prisma.order.aggregate({ where: { createdAt: { gte: thisMonth } }, _sum: { totalAmount: true } }),
        prisma.order.aggregate({ _sum: { totalAmount: true } }),
        prisma.auditLog.count({ where: { action: 'PAYMENT_RECEIVED' } }),
      ]);

      return NextResponse.json({
        totalPayments: successfulPayments,
        monthlyAmount: monthlyRevenue._sum?.totalAmount || 0,
        todayPayments: todayOrders,
        todayAmount: 0,
        totalRevenue: totalRevenue._sum?.totalAmount || 0,
      });
    }

    // List all payments from audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where: { action: 'PAYMENT_RECEIVED' },
      orderBy: { createdAt: 'desc' },
      take: count,
      select: {
        id: true,
        newValue: true,
        createdAt: true,
        userId: true,
      },
    });

    // Get user details separately
    const userIds = [...new Set(auditLogs.map(log => log.userId).filter(Boolean))];
    const users = userIds.length > 0 ? await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    }) : [];
    
    const userMap = {};
    users.forEach(u => { userMap[u.id] = u; });

    const payments = auditLogs.map(log => {
      const usr = userMap[log.userId] || {};
      return {
        id: log.id,
        paymentId: log.newValue?.razorpayPaymentId || log.id,
        amount: log.newValue?.amount || 0,
        method: log.newValue?.method || 'Online',
        status: 'captured',
        email: usr.email || 'N/A',
        name: usr.name || 'N/A',
        contact: log.newValue?.contact || '',
        createdAt: log.createdAt,
      };
    });

    return NextResponse.json({ items: payments, count: payments.length });
  } catch (error) {
    console.error('Admin payments error:', error);
    return NextResponse.json({ items: [], count: 0, error: error.message }, { status: 500 });
  }
}