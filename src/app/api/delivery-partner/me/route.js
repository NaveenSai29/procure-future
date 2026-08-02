import prisma from '@/lib/prisma';
import { getSessionUser, successResponse, errorResponse } from '@/lib/auth';

export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) {
      return errorResponse('Unauthorized', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        profileImage: true,
        deliveryPartner: {
          select: {
            id: true,
            vehicleType: true,
            vehicleNumber: true,
            licenseNumber: true,
            licenseDoc: true,
            isVerified: true,
            isOnline: true,
            currentLat: true,
            currentLng: true,
            rating: true,
            totalDeliveries: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user?.deliveryPartner) {
      return errorResponse('Delivery partner profile not found', 404);
    }

    return successResponse({ user });
  } catch (error) {
    console.error('Get delivery partner error:', error);
    return errorResponse('Failed to fetch profile', 500);
  }
}

export async function PATCH(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) {
      return errorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const { name, vehicleType, vehicleNumber, licenseNumber, profileImage } = body;

    // Update user and delivery partner
    const updateData = {};
    if (name) updateData.name = name;
    if (profileImage) updateData.profileImage = profileImage;

    const user = await prisma.user.update({
      where: { id: session.userId },
      data: {
        ...updateData,
        deliveryPartner: {
          update: {
            vehicleType: vehicleType || undefined,
            vehicleNumber: vehicleNumber !== undefined ? vehicleNumber : undefined,
            licenseNumber: licenseNumber !== undefined ? licenseNumber : undefined,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        profileImage: true,
        deliveryPartner: {
          select: {
            id: true,
            vehicleType: true,
            vehicleNumber: true,
            licenseNumber: true,
            licenseDoc: true,
            isVerified: true,
            isOnline: true,
            currentLat: true,
            currentLng: true,
            rating: true,
            totalDeliveries: true,
          },
        },
      },
    });

    return successResponse({ user });
  } catch (error) {
    console.error('Update delivery partner error:', error);
    return errorResponse('Failed to update profile', 500);
  }
}