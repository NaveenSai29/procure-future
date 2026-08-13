import prisma from '@/lib/prisma';
import { getSessionUser, successResponse, errorResponse } from '@/lib/auth';

// GET - List all delivery partner conversations
export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) return errorResponse('Unauthorized', 401);

    const { searchParams } = new URL(request.url);
    const partnerId = searchParams.get('partnerId');
    const unreadOnly = searchParams.get('unreadOnly');
    const status = searchParams.get('status');

    if (partnerId) {
      const where = { partnerId };
      if (status) where.status = status;
      
      const messages = await prisma.deliveryChat.findMany({
        where,
        orderBy: { createdAt: 'asc' }, // Oldest first, latest at bottom
        take: 500,
      });

      return successResponse(messages);
    }

    if (unreadOnly === 'true') {
      const unreadCount = await prisma.deliveryChat.count({
        where: { senderType: 'PARTNER', isRead: false, status: 'OPEN' },
      });
      return successResponse({ unreadCount });
    }

    const partners = await prisma.deliveryPartner.findMany({
      select: {
        id: true,
        user: { select: { id: true, name: true, mobile: true } },
        activeVehicle: { select: { vehicleType: true, vehicleNumber: true } },
      },
      where: {
        chats: { some: {} },
      },
    });

    const conversations = await Promise.all(
      partners.map(async (p) => {
        const [lastOpenMsg, lastResolvedMsg, unreadCount, openCount, resolvedCount] = await Promise.all([
          prisma.deliveryChat.findFirst({
            where: { partnerId: p.id, status: 'OPEN' },
            orderBy: { createdAt: 'desc' },
          }),
          prisma.deliveryChat.findFirst({
            where: { partnerId: p.id, status: 'RESOLVED' },
            orderBy: { resolvedAt: 'desc' },
          }),
          prisma.deliveryChat.count({
            where: { partnerId: p.id, senderType: 'PARTNER', isRead: false, status: 'OPEN' },
          }),
          prisma.deliveryChat.count({
            where: { partnerId: p.id, status: 'OPEN' },
          }),
          prisma.deliveryChat.count({
            where: { partnerId: p.id, status: 'RESOLVED' },
          }),
        ]);
        
        const lastMessage = lastOpenMsg || lastResolvedMsg;
        
        return {
          id: p.id,
          user: p.user,
          vehicleType: p.activeVehicle?.vehicleType || 'N/A',
          vehicleNumber: p.activeVehicle?.vehicleNumber || 'N/A',
          unreadCount,
          openCount,
          resolvedCount,
          hasOpen: openCount > 0,
          lastMessage,
        };
      })
    );

    conversations.sort((a, b) => {
      if (a.hasOpen && !b.hasOpen) return -1;
      if (!a.hasOpen && b.hasOpen) return 1;
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      return new Date(b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.createdAt || 0);
    });

    return successResponse(conversations);
  } catch (error) {
    console.error('Delivery chats error:', error);
    return errorResponse('Failed to fetch chats', 500);
  }
}

// POST - Admin sends message to partner (uses existing conversationId)
export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const { partnerId, message } = body;

    if (!partnerId || !message) return errorResponse('partnerId and message required', 400);

    // Find latest OPEN conversation to continue it
    const latestOpenMsg = await prisma.deliveryChat.findFirst({
      where: { partnerId, status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
    });

    const conversationId = latestOpenMsg?.conversationId || `conv-${Date.now()}-${partnerId.slice(0, 6)}`;

    const chat = await prisma.deliveryChat.create({
      data: {
        partnerId,
        senderId: session.userId,
        senderType: 'ADMIN',
        message,
        conversationId,
        status: 'OPEN',
      },
    });

    // Notify partner
    try {
      const { NotificationService } = await import('@/services/notification.service');
      const partner = await prisma.deliveryPartner.findUnique({
        where: { id: partnerId },
        select: { userId: true },
      });
      
      if (partner?.userId) {
        NotificationService.send({
          userId: partner.userId,
          type: 'IN_APP',
          title: '💬 Support Reply',
          message: `${message.substring(0, 80)}${message.length > 80 ? '...' : ''}`,
        }).catch(() => {});
      }
    } catch (notifyErr) {
      console.error('Notify partner error:', notifyErr.message);
    }

    return successResponse({ chat }, 201);
  } catch (error) {
    return errorResponse('Failed to send message', 500);
  }
}

// PATCH - Mark as read or resolve
export async function PATCH(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const { partnerId, action } = body;

    if (!partnerId) return errorResponse('partnerId required', 400);

    if (action === 'RESOLVE') {
      await prisma.deliveryChat.updateMany({
        where: { partnerId, status: 'OPEN' },
        data: { status: 'RESOLVED', resolvedAt: new Date() },
      });
      return successResponse({ message: 'Conversation resolved' });
    }

    await prisma.deliveryChat.updateMany({
      where: {
        partnerId,
        senderType: 'PARTNER',
        isRead: false,
      },
      data: { isRead: true },
    });

    return successResponse({ message: 'Marked as read' });
  } catch (error) {
    return errorResponse('Failed to update', 500);
  }
}