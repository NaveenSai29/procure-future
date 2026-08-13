import prisma from '@/lib/prisma';
import { getSessionUser, successResponse, errorResponse } from '@/lib/auth';
import { NotificationService } from '@/services/notification.service';

/**
 * GET - Get chat messages for a delivery
 * Both buyer and delivery partner can access
 */
export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse('Not authenticated', 401);

    const { searchParams } = new URL(request.url);
    const deliveryId = searchParams.get('deliveryId');

    if (!deliveryId) return errorResponse('deliveryId required', 400);

    // Verify user is part of this delivery (buyer or partner)
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: {
        order: { select: { buyerId: true } },
        partner: { select: { userId: true } },
      },
    });

    if (!delivery) return errorResponse('Delivery not found', 404);

    const isBuyer = delivery.order?.buyerId === session.userId;
    const isPartner = delivery.partner?.userId === session.userId;

    if (!isBuyer && !isPartner) return errorResponse('Access denied', 403);

    const messages = await prisma.deliveryChatMessage.findMany({
      where: { deliveryId },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    // Mark as read for the current user
    await prisma.deliveryChatMessage.updateMany({
      where: {
        deliveryId,
        senderId: { not: session.userId },
        isRead: false,
      },
      data: { isRead: true },
    });

    return successResponse({ messages });
  } catch (error) {
    console.error('Delivery chat fetch error:', error);
    return errorResponse('Failed to fetch chat', 500);
  }
}

/**
 * POST - Send a chat message
 * Both buyer and delivery partner can send
 */
export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse('Not authenticated', 401);

    const { deliveryId, message } = await request.json();
    if (!deliveryId || !message) return errorResponse('deliveryId and message required', 422);

    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: {
        order: { select: { buyerId: true } },
        partner: { select: { userId: true } },
      },
    });

    if (!delivery) return errorResponse('Delivery not found', 404);

    const isBuyer = delivery.order?.buyerId === session.userId;
    const isPartner = delivery.partner?.userId === session.userId;

    if (!isBuyer && !isPartner) return errorResponse('Access denied', 403);

    const senderType = isBuyer ? 'BUYER' : 'PARTNER';

    const msg = await prisma.deliveryChatMessage.create({
      data: {
        deliveryId,
        senderId: session.userId,
        senderType,
        message,
      },
    });

    // Notify the other party
    const notifyUserId = isBuyer ? delivery.partner.userId : delivery.order.buyerId;
    
    NotificationService.send({
      userId: notifyUserId,
      type: 'IN_APP',
      title: '💬 New Message',
      message: `${message.substring(0, 80)}${message.length > 80 ? '...' : ''}`,
    }).catch(() => {});

    return successResponse({ message: msg }, 201);
  } catch (error) {
    console.error('Delivery chat send error:', error);
    return errorResponse('Failed to send message', 500);
  }
}