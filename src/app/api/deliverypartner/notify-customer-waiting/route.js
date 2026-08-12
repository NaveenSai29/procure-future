import prisma from '@/lib/prisma';
import { getSessionUser, successResponse, errorResponse } from '@/lib/auth';
import { NotificationService } from '@/services/notification.service';

/**
 * POST - Notify customer that delivery partner is waiting
 * Called when partner starts the 5-minute wait timer at customer location
 */
export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) {
      return errorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const { deliveryId, orderId } = body;

    if (!deliveryId && !orderId) {
      return errorResponse('deliveryId or orderId required', 400);
    }

    // Get delivery partner profile
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        mobile: true,
        deliveryPartner: {
          select: { id: true },
        },
      },
    });

    if (!user?.deliveryPartner) {
      return errorResponse('Delivery partner profile not found', 404);
    }

    // Find the delivery and order
    const delivery = await prisma.delivery.findFirst({
      where: {
        id: deliveryId || undefined,
        partnerId: user.deliveryPartner.id,
      },
      include: {
        order: {
          select: {
            id: true,
            buyerId: true,
            buyer: {
              select: {
                id: true,
                name: true,
                mobile: true,
                expoPushToken: true,
              },
            },
          },
        },
      },
    });

    if (!delivery) {
      return errorResponse('Delivery not found', 404);
    }

    const buyerId = delivery.order?.buyerId;
    if (!buyerId) {
      return errorResponse('Buyer not found for this order', 404);
    }

    // Send notification to buyer
    const notification = await NotificationService.send({
      userId: buyerId,
      type: 'IN_APP',
      title: '📍 Delivery Partner is Waiting',
      message: `${user.name || 'Your delivery partner'} has arrived at your location and is waiting. Please meet them to receive your order #${delivery.order.id.slice(0, 8).toUpperCase()}.`,
      eventType: 'delivery_partner_waiting',
      data: {
        deliveryId: delivery.id,
        orderId: delivery.order.id,
        partnerName: user.name,
        partnerMobile: user.mobile,
        timestamp: new Date().toISOString(),
      },
    });

    // Also try to send push notification
    try {
      await NotificationService.send({
        userId: buyerId,
        type: 'PUSH',
        title: '📍 Delivery Partner is Waiting',
        message: `${user.name || 'Your delivery partner'} is at your location. Please come out to collect your order.`,
        eventType: 'delivery_partner_waiting',
        data: {
          deliveryId: delivery.id,
          orderId: delivery.order.id,
        },
      });
    } catch (pushError) {
      console.log('Push notification failed:', pushError.message);
      // Continue even if push fails — in-app notification already sent
    }

    return successResponse({
      message: 'Customer notified successfully',
      notificationId: notification?.id,
    });
  } catch (error) {
    console.error('Notify customer waiting error:', error);
    return errorResponse('Failed to notify customer', 500);
  }
}