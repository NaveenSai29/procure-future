import prisma from '@/lib/prisma';
import { getSessionUser, successResponse, errorResponse } from '@/lib/auth';

/**
 * POST - Partner accepts broadcast order (first accept wins)
 */
export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const { orderId } = body;

    if (!orderId) return errorResponse('orderId required', 400);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { deliveryPartner: { select: { id: true, isVerified: true } } },
    });

    if (!user?.deliveryPartner) return errorResponse('Partner profile not found', 404);
    if (!user.deliveryPartner.isVerified) return errorResponse('Partner not verified', 400);

    // Check if already assigned (race condition protection)
    const existingDelivery = await prisma.delivery.findUnique({ where: { orderId } });
    if (existingDelivery) {
      return errorResponse('Order already taken by another partner', 409);
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return errorResponse('Order not found', 404);

    // COD limit check
    if (order.paymentMethod === 'COD') {
      const wallet = await prisma.partnerWallet.findUnique({ 
        where: { partnerId: user.deliveryPartner.id } 
      });
      const codPending = wallet?.codPending || 0;
      const codMaxPendingSetting = await prisma.systemSetting.findFirst({ 
        where: { category: 'DELIVERY', key: 'codMaxPending' } 
      });
      const codMaxPending = codMaxPendingSetting ? parseFloat(codMaxPendingSetting.value) : 5000;
      
      if ((codPending + order.totalAmount) > codMaxPending) {
        return errorResponse('COD limit reached. Deposit first.', 400);
      }
    }

    // Create delivery — first accept wins
    const delivery = await prisma.delivery.create({
      data: {
        orderId,
        partnerId: user.deliveryPartner.id,
        status: 'ASSIGNED',
      },
      include: {
        order: {
          select: { id: true, totalAmount: true, deliveryFee: true, status: true },
        },
        partner: {
          select: {
            id: true,
            activeVehicle: { select: { vehicleType: true, vehicleNumber: true } },
            user: { select: { id: true, name: true, mobile: true } },
          },
        },
      },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'READY_FOR_PICKUP' },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: 'READY_FOR_PICKUP',
        changedBy: session.userId,
        notes: `Accepted via broadcast by ${user.deliveryPartner.id}`,
      },
    });

    return successResponse({
      message: 'Order accepted!',
      delivery,
    }, 201);
  } catch (error) {
    console.error('Accept broadcast error:', error);
    return errorResponse('Failed to accept order', 500);
  }
}