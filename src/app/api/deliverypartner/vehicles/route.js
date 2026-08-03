import prisma from '@/lib/prisma';
import { getSessionUser, successResponse, errorResponse } from '@/lib/auth';

// GET — List all vehicles
export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) return errorResponse('Unauthorized', 401);

    const partner = await prisma.deliveryPartner.findUnique({ where: { userId: session.userId } });
    if (!partner) return errorResponse('Partner not found', 404);

    const vehicles = await prisma.partnerVehicle.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse({ vehicles });
  } catch (error) {
    return errorResponse('Failed to fetch vehicles', 500);
  }
}

// POST — Add new vehicle
export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const { vehicleType, vehicleNumber } = body;

    if (!vehicleType) return errorResponse('Vehicle type is required', 400);

    const partner = await prisma.deliveryPartner.findUnique({ where: { userId: session.userId } });
    if (!partner) return errorResponse('Partner not found', 404);

    // Auto-format vehicle number: TN11BB8227 → TN 11 BB 8227
    const formattedNumber = vehicleNumber ? formatVehicleNumber(vehicleNumber) : null;

    const vehicle = await prisma.partnerVehicle.create({
      data: {
        partnerId: partner.id,
        vehicleType,
        vehicleNumber: formattedNumber,
      },
    });

    // If this is the first vehicle, set it as active
    const vehicleCount = await prisma.partnerVehicle.count({ where: { partnerId: partner.id } });
    if (vehicleCount === 1) {
      await prisma.deliveryPartner.update({
        where: { id: partner.id },
        data: { activeVehicleId: vehicle.id },
      });
    }

    return successResponse({ vehicle }, 201);
  } catch (error) {
    return errorResponse('Failed to add vehicle', 500);
  }
}

// PATCH — Update vehicle (upload RC, switch active)
export async function PATCH(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const { vehicleId, action, rcDocument, vehicleNumber } = body;

    const partner = await prisma.deliveryPartner.findUnique({ where: { userId: session.userId } });
    if (!partner) return errorResponse('Partner not found', 404);

    const vehicle = await prisma.partnerVehicle.findFirst({
      where: { id: vehicleId, partnerId: partner.id },
    });
    if (!vehicle) return errorResponse('Vehicle not found', 404);

    switch (action) {
      case 'upload_rc':
        await prisma.partnerVehicle.update({
          where: { id: vehicleId },
          data: { rcDocument, verificationStatus: 'PENDING', verificationNote: null },
        });
        break;
      case 'switch_active':
        await prisma.deliveryPartner.update({
          where: { id: partner.id },
          data: { activeVehicleId: vehicleId },
        });
        break;
      case 'update_number':
        const formattedNumber = vehicleNumber ? formatVehicleNumber(vehicleNumber) : null;
        await prisma.partnerVehicle.update({
          where: { id: vehicleId },
          data: { vehicleNumber: formattedNumber },
        });
        break;
      default:
        return errorResponse('Invalid action', 400);
    }

    const vehicles = await prisma.partnerVehicle.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: 'desc' },
    });

    const updatedPartner = await prisma.deliveryPartner.findUnique({
      where: { id: partner.id },
      select: { activeVehicleId: true },
    });

    return successResponse({ vehicles, activeVehicleId: updatedPartner.activeVehicleId });
  } catch (error) {
    return errorResponse('Failed to update vehicle', 500);
  }
}

// Helper: Format vehicle number
function formatVehicleNumber(number) {
  const cleaned = number.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (cleaned.length >= 4) {
    const state = cleaned.slice(0, 2);
    const district = cleaned.slice(2, 4);
    const rest = cleaned.slice(4);
    if (rest.length >= 4) {
      const series = rest.slice(0, 2);
      const digits = rest.slice(2);
      return `${state} ${district} ${series} ${digits}`;
    }
    return `${state} ${district} ${rest}`;
  }
  return cleaned;
}