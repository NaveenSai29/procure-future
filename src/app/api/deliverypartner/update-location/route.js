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

    const partner = await prisma.deliveryPartner.findUnique({
      where: { id: user.deliveryPartner.id },
      select: { currentLat: true, currentLng: true, lastLocationAt: true },
    });

    let currentSpeed = null;
    const now = new Date();

    if (partner?.currentLat && partner?.currentLng && partner?.lastLocationAt) {
      const R = 6371;
      const dLat = (latitude - partner.currentLat) * Math.PI / 180;
      const dLng = (longitude - partner.currentLng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(partner.currentLat * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const timeHours = (now - new Date(partner.lastLocationAt)) / (1000 * 60 * 60);
      
      if (timeHours > 0 && distanceKm > 0.01) {
        // Only calculate speed if actually moved
        const rawSpeed = distanceKm / timeHours;
        
        // If speed is very low (stopped), keep last known speed
        if (rawSpeed > 3) {
          // Moving average: 70% new speed + 30% previous speed
          if (partner.currentSpeed && partner.currentSpeed > 0) {
            currentSpeed = Math.round((rawSpeed * 0.7 + partner.currentSpeed * 0.3) * 10) / 10;
          } else {
            currentSpeed = Math.round(rawSpeed * 10) / 10;
          }
        } else {
          // Stopped or very slow - keep previous speed
          currentSpeed = partner.currentSpeed;
        }
      }
    }

    await prisma.deliveryPartner.update({
      where: { id: user.deliveryPartner.id },
      data: {
        currentLat: latitude,
        currentLng: longitude,
        lastLocationAt: now,
        currentSpeed: currentSpeed,
      },
    });

    return successResponse({ message: 'Location updated', speed: currentSpeed ? Math.round(currentSpeed * 10) / 10 : null });
  } catch (error) {
    console.error('Update location error:', error);
    return errorResponse('Failed to update location', 500);
  }
}