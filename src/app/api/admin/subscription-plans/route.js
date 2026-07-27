import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const admin = await prisma.adminProfile.findFirst({ where: { userId: user.id } });
    if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const plans = await prisma.subscriptionPlan.findMany({
      include: { _count: { select: { subscriptions: true } } },
      orderBy: { sortOrder: 'asc' }
    });

    const activeSubscriptions = await prisma.subscription.count({ where: { status: 'ACTIVE' } });
    const trialSubscriptions = await prisma.subscription.count({ where: { status: 'TRIAL' } });
    const totalRevenue = await prisma.subscriptionPlan.aggregate({
      _sum: { price: true },
      where: { subscriptions: { some: { status: 'ACTIVE' } } }
    });

    return NextResponse.json({
      plans,
      stats: {
        totalPlans: plans.length,
        activeSubscriptions,
        trialSubscriptions,
        estimatedMRR: totalRevenue._sum?.price || 0
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const admin = await prisma.adminProfile.findFirst({ where: { userId: user.id } });
    if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const body = await request.json();
    const plan = await prisma.subscriptionPlan.create({ data: body });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE_PLAN',
        entity: 'SubscriptionPlan',
        entityId: plan.id,
        newValue: { name: plan.name, price: plan.price },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      }
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}