import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const offers = await prisma.offer.findMany({
      include: { supplier: { select: { businessName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    return NextResponse.json({ offers });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}