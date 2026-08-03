import prisma from '@/lib/prisma';
import { getSessionUser, successResponse, errorResponse } from '@/lib/auth';

export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) return errorResponse('Unauthorized', 401);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true, name: true, email: true, mobile: true,
        mobileVerified: true, profileImage: true,
        deliveryPartner: {
          select: {
            id: true, licenseNumber: true, licenseDoc: true,
            profilePhoto: true, selfieWithVehicle: true,
            isVerified: true, verificationStatus: true, verificationNote: true,
            isOnline: true, currentLat: true, currentLng: true,
            rating: true, totalDeliveries: true,
            activeVehicleId: true, createdAt: true,
            vehicles: {
              select: {
                id: true, vehicleType: true, vehicleNumber: true,
                rcDocument: true, isVerified: true,
                verificationStatus: true, verificationNote: true,
              },
              orderBy: { createdAt: 'desc' },
            },
            activeVehicle: {
              select: {
                id: true, vehicleType: true, vehicleNumber: true,
                rcDocument: true, isVerified: true,
              },
            },
            documentChecks: {
              select: {
                documentType: true, documentUrl: true,
                status: true, rejectionReason: true,
              },
            },
          },
        },
      },
    });

    if (!user?.deliveryPartner) return errorResponse('Delivery partner profile not found', 404);
    return successResponse({ user });
  } catch (error) {
    console.error('Get delivery partner error:', error);
    return errorResponse('Failed to fetch profile', 500);
  }
}

export async function PATCH(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const { name, licenseNumber, profileImage, licenseDoc, profilePhoto, selfieWithVehicle, activeVehicleId, vehicleType, vehicleNumber } = body;

    const userUpdateData = {};
    if (name) userUpdateData.name = name;
    if (profileImage) userUpdateData.profileImage = profileImage;

    const partnerUpdateData = {};
    if (licenseNumber !== undefined) partnerUpdateData.licenseNumber = licenseNumber;
    if (licenseDoc !== undefined) partnerUpdateData.licenseDoc = licenseDoc;
    if (profilePhoto !== undefined) partnerUpdateData.profilePhoto = profilePhoto;
    if (selfieWithVehicle !== undefined) partnerUpdateData.selfieWithVehicle = selfieWithVehicle;
    if (activeVehicleId) partnerUpdateData.activeVehicleId = activeVehicleId;

    // If vehicleType/vehicleNumber provided, create or update PartnerVehicle
    if (vehicleType || vehicleNumber) {
      const partner = await prisma.deliveryPartner.findUnique({ where: { userId: session.userId } });
      if (partner) {
        const existingVehicle = await prisma.partnerVehicle.findFirst({
          where: { partnerId: partner.id },
          orderBy: { createdAt: 'desc' },
        });
        
        if (existingVehicle) {
          const vehicleUpdateData = {};
          if (vehicleType) vehicleUpdateData.vehicleType = vehicleType;
          if (vehicleNumber) vehicleUpdateData.vehicleNumber = vehicleNumber;
          await prisma.partnerVehicle.update({
            where: { id: existingVehicle.id },
            data: vehicleUpdateData,
          });
        } else {
          const newVehicle = await prisma.partnerVehicle.create({
            data: {
              partnerId: partner.id,
              vehicleType: vehicleType || 'Bike',
              vehicleNumber: vehicleNumber || null,
            },
          });
          partnerUpdateData.activeVehicleId = newVehicle.id;
        }
      }
    }

    // Update document verification status
    const docUpdates = [];
    const partnerForDocs = await prisma.deliveryPartner.findUnique({ where: { userId: session.userId } });
    const partnerId = partnerForDocs?.id;
    
    if (partnerId) {
      if (licenseDoc !== undefined) {
        docUpdates.push(
          prisma.documentVerification.upsert({
            where: { partnerId_documentType: { partnerId, documentType: 'licenseDoc' } },
            create: { partnerId, documentType: 'licenseDoc', documentUrl: licenseDoc, status: 'PENDING' },
            update: { documentUrl: licenseDoc, status: 'PENDING', rejectionReason: null },
          })
        );
      }
      if (profilePhoto !== undefined) {
        docUpdates.push(
          prisma.documentVerification.upsert({
            where: { partnerId_documentType: { partnerId, documentType: 'profilePhoto' } },
            create: { partnerId, documentType: 'profilePhoto', documentUrl: profilePhoto, status: 'PENDING' },
            update: { documentUrl: profilePhoto, status: 'PENDING', rejectionReason: null },
          })
        );
      }
      if (selfieWithVehicle !== undefined) {
        docUpdates.push(
          prisma.documentVerification.upsert({
            where: { partnerId_documentType: { partnerId, documentType: 'selfieWithVehicle' } },
            create: { partnerId, documentType: 'selfieWithVehicle', documentUrl: selfieWithVehicle, status: 'PENDING' },
            update: { documentUrl: selfieWithVehicle, status: 'PENDING', rejectionReason: null },
          })
        );
      }
    }

    const [user] = await Promise.all([
      prisma.user.update({
        where: { id: session.userId },
        data: {
          ...userUpdateData,
          deliveryPartner: Object.keys(partnerUpdateData).length > 0 ? { update: partnerUpdateData } : undefined,
        },
        select: {
          id: true, name: true, email: true, mobile: true,
          mobileVerified: true, profileImage: true,
          deliveryPartner: {
            select: {
              id: true, licenseNumber: true, licenseDoc: true,
              profilePhoto: true, selfieWithVehicle: true,
              isVerified: true, verificationStatus: true, verificationNote: true,
              isOnline: true, currentLat: true, currentLng: true,
              rating: true, totalDeliveries: true, activeVehicleId: true,
              vehicles: { select: { id: true, vehicleType: true, vehicleNumber: true, rcDocument: true, isVerified: true, verificationStatus: true, verificationNote: true }, orderBy: { createdAt: 'desc' } },
              activeVehicle: { select: { id: true, vehicleType: true, vehicleNumber: true, rcDocument: true, isVerified: true } },
              documentChecks: { select: { documentType: true, documentUrl: true, status: true, rejectionReason: true } },
            },
          },
        },
      }),
      ...docUpdates,
    ]);

    return successResponse({ user });
  } catch (error) {
    console.error('Update delivery partner error:', error);
    return errorResponse('Failed to update profile', 500);
  }
}