import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

export async function GET(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { id } = await params;

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      select: {
        id: true,
        businessName: true,
        businessType: true,
        email: true,
        mobile: true,
        gstin: true,
        isVerified: true,
        isActive: true,
        codEnabled: true,
        codThreshold: true,
        processingSlaHours: true,
        pickupSlaHours: true,
        autoCancelEnabled: true,
        _count: { select: { products: true, warehouses: true, dedicatedAgents: true } },
        dedicatedAgents: {
          select: {
            id: true,
            partner: {
              select: {
                id: true,
                rating: true,
                totalDeliveries: true,
                isOnline: true,
                activeVehicle: { select: { vehicleType: true, vehicleNumber: true } },
                user: { select: { name: true, mobile: true } },
              },
            },
          },
        },
      },
    });

    if (!supplier) return errorResponse("Supplier not found", 404);

    return successResponse(supplier);
  } catch (error) {
    return errorResponse("Failed to fetch supplier", 500);
  }
}