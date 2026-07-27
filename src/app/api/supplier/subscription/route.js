import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id }
    });
    if (!supplierStaff) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    // Get current subscription
    const subscription = await prisma.subscription.findUnique({
      where: { supplierId: supplierStaff.supplierId },
      include: { plan: true }
    });

    // Get all available plans
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });

    // Get usage stats for limits
    const [productCount, staffCount, warehouseCount, branchCount] = await Promise.all([
      prisma.product.count({ where: { supplierId: supplierStaff.supplierId } }),
      prisma.supplierStaff.count({ where: { supplierId: supplierStaff.supplierId } }),
      prisma.warehouse.count({ where: { supplierId: supplierStaff.supplierId } }),
      prisma.supplierBranch.count({ where: { supplierId: supplierStaff.supplierId } })
    ]);

    return NextResponse.json({
      currentSubscription: subscription,
      plans,
      usage: { productCount, staffCount, warehouseCount, branchCount }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id }
    });
    if (!supplierStaff) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    const { planId } = await request.json();
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

    // Create or update subscription
    const now = new Date();
    const endDate = new Date();
    if (plan.billingCycle === 'MONTHLY') endDate.setMonth(endDate.getMonth() + 1);
    else if (plan.billingCycle === 'QUARTERLY') endDate.setMonth(endDate.getMonth() + 3);
    else if (plan.billingCycle === 'YEARLY') endDate.setFullYear(endDate.getFullYear() + 1);

    // If they have trial, start after trial
    const existingSub = await prisma.subscription.findUnique({
      where: { supplierId: supplierStaff.supplierId }
    });

    const subscription = await prisma.subscription.upsert({
      where: { supplierId: supplierStaff.supplierId },
      create: {
        supplierId: supplierStaff.supplierId,
        planId,
        status: 'ACTIVE',
        startDate: now,
        endDate,
        trialEndDate: plan.trialDays > 0 ? new Date(now.getTime() + plan.trialDays * 86400000) : null,
        nextPaymentDate: plan.trialDays > 0 ? new Date(now.getTime() + plan.trialDays * 86400000) : now
      },
      update: {
        planId,
        status: 'ACTIVE',
        startDate: now,
        endDate,
        nextPaymentDate: now
      }
    });

    return NextResponse.json(subscription);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}