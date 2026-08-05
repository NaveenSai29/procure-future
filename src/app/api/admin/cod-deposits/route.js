import prisma from '@/lib/prisma';
import { getSessionUser, successResponse, errorResponse } from '@/lib/auth';

// GET - List all COD deposits for admin
export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) return errorResponse('Unauthorized', 401);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { roles: { include: { role: true } } },
    });

    const isAdmin = user?.roles?.some(r => r.role.name === 'ADMIN' || r.role.name === 'SUPER_ADMIN');
    if (!isAdmin) return errorResponse('Forbidden', 403);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDING';

    const deposits = await prisma.cODDeposit.findMany({
      where: { status },
      include: {
        partner: {
          select: {
            id: true,
            user: { select: { name: true, mobile: true } },
            activeVehicle: { select: { vehicleType: true, vehicleNumber: true } },
          },
        },
        wallet: { select: { codPending: true, codCollected: true, totalEarned: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return successResponse({ deposits });
  } catch (error) {
    console.error('COD deposits error:', error);
    return errorResponse('Failed to fetch deposits', 500);
  }
}

// PATCH - Approve or reject deposit
export async function PATCH(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) return errorResponse('Unauthorized', 401);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { roles: { include: { role: true } } },
    });

    const isAdmin = user?.roles?.some(r => r.role.name === 'ADMIN' || r.role.name === 'SUPER_ADMIN');
    if (!isAdmin) return errorResponse('Forbidden', 403);

    const body = await request.json();
    const { depositId, action, adminNote } = body;

    if (!depositId || !action) return errorResponse('depositId and action required', 400);

    const deposit = await prisma.cODDeposit.findUnique({ where: { id: depositId } });
    if (!deposit) return errorResponse('Deposit not found', 404);
    if (deposit.status !== 'PENDING') return errorResponse('Deposit already processed', 400);

    if (action === 'APPROVE') {
      // Approve: reduce codPending by deposit amount
      await prisma.$transaction([
        prisma.cODDeposit.update({
          where: { id: depositId },
          data: { status: 'APPROVED', adminNote, processedAt: new Date() },
        }),
        prisma.partnerWallet.update({
          where: { id: deposit.walletId },
          data: { codPending: { decrement: deposit.amount } },
        }),
      ]);

      return successResponse({ message: 'Deposit approved. COD pending cleared.' });
    }

    if (action === 'REJECT') {
      await prisma.cODDeposit.update({
        where: { id: depositId },
        data: { status: 'REJECTED', adminNote, processedAt: new Date() },
      });
      return successResponse({ message: 'Deposit rejected.' });
    }

    return errorResponse('Invalid action. Use APPROVE or REJECT', 400);
  } catch (error) {
    console.error('COD deposit update error:', error);
    return errorResponse('Failed to process deposit', 500);
  }
}