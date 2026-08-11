import prisma from '@/lib/prisma';
import { getSessionUser, successResponse, errorResponse } from '@/lib/auth';

export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) return errorResponse('Unauthorized', 401);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { roles: { include: { role: true } } },
    });

    const isAdmin = user?.roles?.some(r => ['ADMIN', 'SUPER_ADMIN'].includes(r.role.name));
    if (!isAdmin) return errorResponse('Forbidden', 403);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where = {};
    if (status === 'verified') where.isVerified = true;
    if (status === 'unverified') where.isVerified = false;
    if (status === 'pending') where.verificationStatus = 'PENDING';
    if (status === 'rejected') where.verificationStatus = 'REJECTED';
    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { mobile: { contains: search } } },
        { licenseNumber: { contains: search, mode: 'insensitive' } },
        { vehicles: { some: { vehicleNumber: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [partners, total, stats] = await Promise.all([
      prisma.deliveryPartner.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, mobile: true, mobileVerified: true, profileImage: true },
          },
          deliveries: { select: { id: true, status: true } },
          wallet: {
            select: {
              id: true, totalEarned: true, codCollected: true,
              codPending: true, securityDeposit: true,
            },
          },
          documentChecks: { select: { documentType: true, documentUrl: true, status: true, rejectionReason: true } },
          vehicles: { select: { id: true, vehicleType: true, vehicleNumber: true, rcDocument: true, isVerified: true, verificationStatus: true, verificationNote: true }, orderBy: { createdAt: 'desc' } },
          activeVehicle: { select: { id: true, vehicleType: true, vehicleNumber: true, rcDocument: true, isVerified: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.deliveryPartner.count({ where }),
      prisma.$transaction([
        prisma.deliveryPartner.count({ where: { isVerified: true } }),
        prisma.deliveryPartner.count({ where: { verificationStatus: 'PENDING' } }),
        prisma.deliveryPartner.count({ where: { verificationStatus: 'REJECTED' } }),
        prisma.deliveryPartner.count({ where: { isOnline: true } }),
      ]),
    ]);

    return successResponse({
      partners,
      stats: { verified: stats[0], pending: stats[1], rejected: stats[2], online: stats[3], total },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Admin delivery partners error:', error);
    return errorResponse('Failed to fetch partners', 500);
  }
}

export async function PATCH(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) return errorResponse('Unauthorized', 401);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { roles: { include: { role: true } } },
    });

    const isAdmin = user?.roles?.some(r => ['ADMIN', 'SUPER_ADMIN'].includes(r.role.name));
    if (!isAdmin) return errorResponse('Forbidden', 403);

    const body = await request.json();
    const { partnerId, action, reason, documentType, vehicleId, name, mobile, licenseNumber, vehicleNumber, vehicleType } = body;

    if (!partnerId || !action) return errorResponse('partnerId and action required', 400);

    const partner = await prisma.deliveryPartner.findUnique({ where: { id: partnerId } });
    if (!partner) return errorResponse('Partner not found', 404);

    switch (action) {
      case 'verify':
        const verifiedPartner = await prisma.deliveryPartner.update({
          where: { id: partnerId },
          data: { isVerified: true, verificationStatus: 'APPROVED', verificationNote: null },
          select: { userId: true, profilePhoto: true },
        });
        if (verifiedPartner.profilePhoto) {
          await prisma.user.update({
            where: { id: verifiedPartner.userId },
            data: { profileImage: verifiedPartner.profilePhoto },
          });
        }
        return successResponse({ message: 'Partner approved successfully' });

      case 'reject':
        await prisma.deliveryPartner.update({
          where: { id: partnerId },
          data: { isVerified: false, verificationStatus: 'REJECTED', verificationNote: reason || 'Documents need attention' },
        });
        return successResponse({ message: 'Partner rejected' });

      case 'unverify':
        await prisma.deliveryPartner.update({
          where: { id: partnerId },
          data: { isVerified: false, verificationStatus: 'PENDING', verificationNote: null },
        });
        return successResponse({ message: 'Partner unverified' });

      case 'approve_doc':
        if (!documentType) return errorResponse('documentType is required', 400);
        await prisma.documentVerification.upsert({
          where: { partnerId_documentType: { partnerId, documentType } },
          create: { partnerId, documentType, status: 'APPROVED', rejectionReason: null },
          update: { status: 'APPROVED', rejectionReason: null },
        });
        return successResponse({ message: `${documentType} approved` });

      case 'reject_doc':
        if (!documentType) return errorResponse('documentType is required', 400);
        await prisma.documentVerification.upsert({
          where: { partnerId_documentType: { partnerId, documentType } },
          create: { partnerId, documentType, status: 'REJECTED', rejectionReason: reason || 'Document rejected' },
          update: { status: 'REJECTED', rejectionReason: reason || 'Document rejected' },
        });
        // Also unverify the partner so the app redirects to verification screen
        await prisma.deliveryPartner.update({
          where: { id: partnerId },
          data: { isVerified: false, verificationStatus: 'REJECTED' },
        });
        return successResponse({ message: `${documentType} rejected — Partner unverified` });

      case 'approve_vehicle':
        if (!vehicleId) return errorResponse('vehicleId is required', 400);
        await prisma.partnerVehicle.update({
          where: { id: vehicleId },
          data: { isVerified: true, verificationStatus: 'APPROVED', verificationNote: null },
        });
        return successResponse({ message: 'Vehicle approved' });

      case 'reject_vehicle':
        if (!vehicleId) return errorResponse('vehicleId is required', 400);
        await prisma.partnerVehicle.update({
          where: { id: vehicleId },
          data: { isVerified: false, verificationStatus: 'REJECTED', verificationNote: reason || 'Vehicle rejected' },
        });
        // Also unverify the partner so the app redirects to verification screen
        await prisma.deliveryPartner.update({
          where: { id: partnerId },
          data: { isVerified: false, verificationStatus: 'REJECTED' },
        });
        return successResponse({ message: 'Vehicle rejected — Partner unverified' });

      case 'update_partner':
        // Update user info
        if (name || mobile) {
          const userUpdateData = {};
          if (name) userUpdateData.name = name;
          if (mobile) userUpdateData.mobile = mobile;
          await prisma.user.update({ where: { id: partner.userId }, data: userUpdateData });
        }
        // Update partner info
        const partnerUpdateData = {};
        if (licenseNumber !== undefined) partnerUpdateData.licenseNumber = licenseNumber;
        if (Object.keys(partnerUpdateData).length > 0) {
          await prisma.deliveryPartner.update({ where: { id: partnerId }, data: partnerUpdateData });
        }
        // Update active vehicle
        if (vehicleNumber || vehicleType) {
          if (partner.activeVehicleId) {
            const vehicleUpdateData = {};
            if (vehicleNumber) vehicleUpdateData.vehicleNumber = vehicleNumber;
            if (vehicleType) vehicleUpdateData.vehicleType = vehicleType;
            await prisma.partnerVehicle.update({ where: { id: partner.activeVehicleId }, data: vehicleUpdateData });
          }
        }
        return successResponse({ message: 'Partner details updated successfully' });

      default:
        return errorResponse('Invalid action. Use: verify, reject, unverify, approve_doc, reject_doc, approve_vehicle, reject_vehicle, update_partner', 400);
    }
  } catch (error) {
    console.error('Admin update partner error:', error);
    return errorResponse('Failed to update partner', 500);
  }
}