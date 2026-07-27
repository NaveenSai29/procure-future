import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const campaigns = await prisma.campaign.findMany({
      include: { supplier: { select: { businessName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    return NextResponse.json({ campaigns });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}