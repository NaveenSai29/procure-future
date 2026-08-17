import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Get AI generation history
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

    const logs = await prisma.aIGenerationLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        supplier: { select: { id: true, businessName: true } },
        product: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: { logs },
    });

  } catch (error) {
    console.error('Get generation logs error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get generation logs' },
      { status: 500 }
    );
  }
}