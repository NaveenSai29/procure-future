import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { RazorpayService } from '@/services/razorpay.service';

export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const admin = await prisma.adminProfile.findFirst({ where: { userId: user.id } });
    if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'stats';

    if (type === 'stats') {
      // Get stats from our database, not Razorpay
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const [totalOrders, todayOrders, monthlyRevenue, totalRevenue, recentTransactions] = await Promise.all([
        prisma.order.count(),
        prisma.order.count({ where: { createdAt: { gte: today } } }),
        prisma.order.aggregate({ where: { createdAt: { gte: thisMonth } }, _sum: { totalAmount: true } }),
        prisma.order.aggregate({ _sum: { totalAmount: true } }),
        prisma.auditLog.findMany({
          where: { action: 'PAYMENT_RECEIVED' },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, newValue: true, createdAt: true },
        }),
      ]);

      return NextResponse.json({
        totalPayments: totalOrders,
        monthlyAmount: monthlyRevenue._sum?.totalAmount || 0,
        todayPayments: todayOrders,
        todayAmount: 0,
        totalRevenue: totalRevenue._sum?.totalAmount || 0,
        recentPayments: recentTransactions.map(t => ({
          id: t.id,
          amount: t.newValue?.amount || 0,
          method: t.newValue?.method || 'N/A',
          createdAt: t.createdAt,
        })),
      });
    }

    // For listing payments, try Razorpay but fallback gracefully
    const count = parseInt(searchParams.get('count') || '50');
    
    try {
      const payments = await RazorpayService.getPayments({ count });
      return NextResponse.json(payments);
    } catch {
      // Razorpay not configured, return empty
      return NextResponse.json({ items: [], count: 0 });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}