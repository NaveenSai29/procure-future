import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PATCH(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { planId } = await params;
    const body = await request.json();
    const plan = await prisma.subscriptionPlan.update({ where: { id: planId }, data: body });
    return NextResponse.json(plan);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { planId } = await params;

    const activeSubs = await prisma.subscription.count({ where: { planId, status: 'ACTIVE' } });
    if (activeSubs > 0) {
      return NextResponse.json({ error: `Cannot delete plan with ${activeSubs} active subscribers` }, { status: 400 });
    }

    await prisma.subscriptionPlan.delete({ where: { id: planId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}