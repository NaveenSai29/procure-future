import prisma from '@/lib/prisma';
import { getSessionUser, successResponse, errorResponse } from '@/lib/auth';

export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) {
      return errorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const { latitude, longitude } = body;

    if (latitude === undefined || longitude === undefined) {
      return errorResponse('Latitude and longitude are required', 400);
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return errorResponse('Invalid coordinates', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        deliveryPartner: {
          select: { id: true },
        },
      },
    });

    if (!user?.deliveryPartner) {
      return errorResponse('Delivery partner profile not found', 404);
    }

    await prisma.deliveryPartner.update({
      where: { id: user.deliveryPartner.id },
      data: {
        currentLat: latitude,
        currentLng: longitude,
      },
    });

    return successResponse({ message: 'Location updated' });
  } catch (error) {
    console.error('Update location error:', error);
    return errorResponse('Failed to update location', 500);
  }
}