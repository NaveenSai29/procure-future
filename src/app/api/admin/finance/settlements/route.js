import prisma from '@/lib/prisma';
import { getSessionUser, successResponse, errorResponse } from '@/lib/auth';

export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) return errorResponse('Unauthorized', 401);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where = {};
    if (status) where.status = status;

    const [settlements, pendingCount, completedCount, totalAmount] = await Promise.all([
      prisma.settlement.findMany({
        where,
        include: {
          partner: {
            select: {
              id: true, vehicleType: true,
              user: { select: { id: true, name: true, mobile: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.settlement.count({ where: { status: 'PENDING' } }),
      prisma.settlement.count({ where: { status: 'COMPLETED' } }),
      prisma.settlement.aggregate({ where: { status: 'PENDING' }, _sum: { amount: true } }),
    ]);

    return successResponse({
      settlements,
      stats: {
        pending: pendingCount,
        completed: completedCount,
        totalAmount: totalAmount._sum.amount || 0,
      },
    });
  } catch (error) {
    console.error('Settlements error:', error);
    return errorResponse('Failed to fetch settlements', 500);
  }
}

export async function PATCH(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const { settlementId, action } = body;

    if (action === 'process') {
      await prisma.settlement.update({
        where: { id: settlementId },
        data: { status: 'COMPLETED', processedAt: new Date(), processedBy: session.userId },
      });
      return successResponse({ message: 'Settlement processed successfully' });
    }

    return errorResponse('Invalid action', 400);
  } catch (error) {
    return errorResponse('Failed to process settlement', 500);
  }
}