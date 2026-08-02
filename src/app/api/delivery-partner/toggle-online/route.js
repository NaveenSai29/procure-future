import prisma from '@/lib/prisma';
import { getSessionUser, successResponse, errorResponse } from '@/lib/auth';

export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) {
      return errorResponse('Unauthorized', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        deliveryPartner: {
          select: { id: true, isOnline: true, isVerified: true },
        },
      },
    });

    if (!user?.deliveryPartner) {
      return errorResponse('Delivery partner profile not found', 404);
    }

    if (!user.deliveryPartner.isVerified) {
      return errorResponse('Your account is not verified yet', 403);
    }

    // Toggle online status
    const updated = await prisma.deliveryPartner.update({
      where: { id: user.deliveryPartner.id },
      data: {
        isOnline: !user.deliveryPartner.isOnline,
        // Reset location when going offline
        ...(user.deliveryPartner.isOnline ? { currentLat: null, currentLng: null } : {}),
      },
      select: {
        isOnline: true,
        currentLat: true,
        currentLng: true,
      },
    });

    return successResponse({
      isOnline: updated.isOnline,
      message: updated.isOnline ? 'You are now online' : 'You are now offline',
    });
  } catch (error) {
    console.error('Toggle online error:', error);
    return errorResponse('Failed to toggle status', 500);
  }
}