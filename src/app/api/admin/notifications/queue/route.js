import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - View email or SMS queue
export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminProfile = await prisma.adminProfile.findFirst({
      where: { userId: user.id }
    });

    if (!adminProfile) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'EMAIL';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    let queue, total;
    if (type === 'EMAIL') {
      [queue, total] = await Promise.all([
        prisma.emailQueue.findMany({
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.emailQueue.count()
      ]);
    } else {
      [queue, total] = await Promise.all([
        prisma.sMSQueue.findMany({
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.sMSQueue.count()
      ]);
    }

    return NextResponse.json({
      queue,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Fetch queue error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch queue' },
      { status: 500 }
    );
  }
}
