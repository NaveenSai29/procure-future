import prisma from '@/lib/prisma';
import { getSessionUser, successResponse, errorResponse } from '@/lib/auth';

// GET - List all delivery partner conversations
export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) return errorResponse('Unauthorized', 401);

    const { searchParams } = new URL(request.url);
    const partnerId = searchParams.get('partnerId');

    if (partnerId) {
      // Get messages with specific partner
      const messages = await prisma.deliveryChat.findMany({
        where: { partnerId },
        orderBy: { createdAt: 'asc' },
        take: 100,
      });
      return successResponse(messages);
    }

    // Get all unique conversations (grouped by partner)
    const partners = await prisma.deliveryPartner.findMany({
      select: {
        id: true,
        user: { select: { id: true, name: true, mobile: true } },
        activeVehicle: { select: { vehicleType: true, vehicleNumber: true } },
        _count: { select: { chats: true } },
      },
      where: {
        chats: { some: {} },
      },
    });

    // Get last message for each partner
    const conversations = await Promise.all(
      partners.map(async (p) => {
        const lastMsg = await prisma.deliveryChat.findFirst({
          where: { partnerId: p.id },
          orderBy: { createdAt: 'desc' },
        });
        return {
          id: p.id,
          user: p.user,
          vehicleType: p.activeVehicle?.vehicleType || 'N/A',
          vehicleNumber: p.activeVehicle?.vehicleNumber || 'N/A',
          _count: p._count,
          lastMessage: lastMsg,
        };
      })
    );

    return successResponse(conversations);
  } catch (error) {
    console.error('Delivery chats error:', error);
    return errorResponse('Failed to fetch chats', 500);
  }
}

// POST - Admin sends message to partner
export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const { partnerId, message } = body;

    if (!partnerId || !message) return errorResponse('partnerId and message required', 400);

    const chat = await prisma.deliveryChat.create({
      data: {
        partnerId,
        senderId: session.userId,
        senderType: 'ADMIN',
        message,
      },
    });

    return successResponse({ chat }, 201);
  } catch (error) {
    return errorResponse('Failed to send message', 500);
  }
}