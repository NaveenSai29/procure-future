import prisma from '@/lib/prisma';
import { getSessionUser, successResponse, errorResponse } from '@/lib/auth';

// GET - Partner gets their chat messages
export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) return errorResponse('Unauthorized', 401);

    const partner = await prisma.deliveryPartner.findUnique({ where: { userId: session.userId } });
    if (!partner) return errorResponse('Partner not found', 404);

    const messages = await prisma.deliveryChat.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    return successResponse(messages);
  } catch (error) {
    return errorResponse('Failed to fetch messages', 500);
  }
}

// POST - Partner sends message
export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) return errorResponse('Unauthorized', 401);

    const partner = await prisma.deliveryPartner.findUnique({ where: { userId: session.userId } });
    if (!partner) return errorResponse('Partner not found', 404);

    const body = await request.json();
    const { message } = body;

    if (!message) return errorResponse('Message required', 400);

    const chat = await prisma.deliveryChat.create({
      data: {
        partnerId: partner.id,
        senderId: session.userId,
        senderType: 'PARTNER',
        message,
      },
    });

    return successResponse({ chat }, 201);
  } catch (error) {
    return errorResponse('Failed to send message', 500);
  }
}