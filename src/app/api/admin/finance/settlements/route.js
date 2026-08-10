import prisma from '@/lib/prisma';
import { getSessionUser, successResponse, errorResponse } from '@/lib/auth';

export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) return errorResponse('Unauthorized', 401);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const supplierId = searchParams.get('supplierId');
    const partnerId = searchParams.get('partnerId');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where = {};
    if (status) where.status = status;
    if (type && type !== 'ALL') where.settlementFor = type;
    if (supplierId && supplierId !== 'ALL') where.supplierId = supplierId;
    if (partnerId && partnerId !== 'ALL') where.partnerId = partnerId;

    const [settlements, pendingCount, completedCount, totalAmount] = await Promise.all([
      prisma.settlement.findMany({
        where,
        include: {
          supplier: { select: { id: true, businessName: true, email: true } },
          partner: {
            select: {
              id: true,
              activeVehicle: { select: { vehicleType: true, vehicleNumber: true } },
              user: { select: { id: true, name: true, mobile: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.settlement.count({ where: { status: 'PENDING' } }),
      prisma.settlement.count({ where: { status: 'PROCESSED' } }),
      prisma.settlement.aggregate({ where: { status: 'PENDING' }, _sum: { amount: true } }),
    ]);

    // Fetch processedBy user details separately
    const processedByIds = [...new Set(settlements.map(s => s.processedBy).filter(Boolean))];
    let userMap = {};
    if (processedByIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: processedByIds } },
        select: { id: true, name: true, email: true },
      });
      users.forEach(u => { userMap[u.id] = u; });
    }

    return successResponse({
      settlements: settlements.map(s => ({ 
        ...s, 
        amount: Number(s.amount),
        processedByUser: s.processedBy ? (userMap[s.processedBy] || null) : null,
      })),
      stats: {
        pending: pendingCount,
        completed: completedCount,
        totalAmount: Number(totalAmount._sum.amount || 0),
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
    const { settlementId, action, force } = body;

    if (action === 'process') {
      const settlement = await prisma.settlement.findUnique({ where: { id: settlementId } });
      if (!settlement) return errorResponse('Settlement not found', 404);
      if (settlement.status !== 'PENDING' && !force) return errorResponse('Settlement already processed. Use force to override.', 409);

      const { FinanceService } = await import('@/services/finance.service');
      
      // Use partner settlement processor for delivery partner settlements
      let result;
      if (settlement.settlementFor === 'DELIVERY_PARTNER') {
        result = await FinanceService.processPartnerSettlement(settlementId);
      } else {
        result = await FinanceService.processSettlement(settlementId);
      }
      
      await prisma.settlement.update({
        where: { id: settlementId },
        data: { processedBy: session.userId },
      });

      return successResponse({ message: 'Settlement processed successfully', result });
    }

    return errorResponse('Invalid action', 400);
  } catch (error) {
    console.error('Process settlement error:', error);
    return errorResponse(error.message || 'Failed to process settlement', 500);
  }
}