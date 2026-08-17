import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Get credit purchase history
export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminProfile = await prisma.adminProfile.findFirst({
      where: { userId: user.id },
    });

    if (!adminProfile) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const purchases = await prisma.aICreditPurchase.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        supplier: { select: { id: true, businessName: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: { purchases },
    });

  } catch (error) {
    console.error('Get purchase history error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get purchase history' },
      { status: 500 }
    );
  }
}