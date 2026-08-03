import prisma from '@/lib/prisma';
import { getSessionUser, successResponse, errorResponse } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) {
      return errorResponse('Unauthorized', 401);
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const documentType = formData.get('documentType'); // 'licenseDoc', 'rcDocument', 'profilePhoto', 'selfieWithVehicle'

    if (!file) {
      return errorResponse('No file uploaded', 400);
    }

    if (!documentType) {
      return errorResponse('Document type is required', 400);
    }

    const validTypes = ['licenseDoc', 'rcDocument', 'profilePhoto', 'selfieWithVehicle'];
    if (!validTypes.includes(documentType)) {
      return errorResponse('Invalid document type', 400);
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return errorResponse('Invalid file type. Only JPG, PNG, WebP, and PDF are allowed.', 400);
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return errorResponse('File size must be less than 5MB', 400);
    }

    // Create upload directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'delivery-partners', session.userId);
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const ext = file.name.split('.').pop();
    const filename = `${documentType}-${Date.now()}.${ext}`;
    const filepath = path.join(uploadDir, filename);

    // Write file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Generate URL
    const url = `/uploads/delivery-partners/${session.userId}/${filename}`;

    // Update record based on document type
    if (documentType === 'rcDocument') {
      // RC document goes to PartnerVehicle (active vehicle)
      const partner = await prisma.deliveryPartner.findUnique({
        where: { userId: session.userId },
        select: { id: true, activeVehicleId: true },
      });
      if (partner?.activeVehicleId) {
        await prisma.partnerVehicle.update({
          where: { id: partner.activeVehicleId },
          data: { rcDocument: url },
        });
      } else if (partner) {
        // No active vehicle — create one
        const newVehicle = await prisma.partnerVehicle.create({
          data: {
            partnerId: partner.id,
            vehicleType: 'Bike',
            rcDocument: url,
          },
        });
        await prisma.deliveryPartner.update({
          where: { id: partner.id },
          data: { activeVehicleId: newVehicle.id },
        });
      }
    } else {
      // Other documents (licenseDoc, profilePhoto, selfieWithVehicle) go to DeliveryPartner
      const updateData = {};
      updateData[documentType] = url;
      await prisma.deliveryPartner.update({
        where: { userId: session.userId },
        data: updateData,
      });
    }

    return successResponse({
      message: 'Document uploaded successfully',
      url,
      documentType,
    });
  } catch (error) {
    console.error('Document upload error:', error);
    return errorResponse('Failed to upload document', 500);
  }
}