import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const suppliers = await prisma.supplier.findMany({
      select: {
        id: true,
        businessName: true,
        businessType: true,
        description: true,
        logo: true,
        banner: true,
        email: true,
        mobile: true,
        website: true,
        gstin: true,
        pan: true,
        gstVerified: true,
        gstBusinessName: true,
        gstVerificationDate: true,
        isVerified: true,
        isActive: true,
        subscriptionId: true,
        codEnabled: true,
        codThreshold: true,
        processingSlaHours: true,
        pickupSlaHours: true,
        autoCancelEnabled: true,
        responseSlaHours: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { products: true, warehouses: true, dedicatedAgents: true } },
        staff: { include: { user: { select: { name: true, email: true } } } },
        warehouses: { take: 3, orderBy: { createdAt: "asc" }, select: { name: true, city: true, state: true } },
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
      orderBy: { createdAt: "desc" },
    });

    return successResponse(suppliers);
  } catch (error) {
    return errorResponse("Failed to fetch suppliers", 500);
  }
}

export async function PATCH(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const body = await request.json();
    const { supplierId, action, codEnabled, codThreshold, processingSlaHours, pickupSlaHours, autoCancelEnabled, responseSlaHours, shopOpenTime, shopCloseTime, shopOpenDays } = body;

    if (action === 'verify') {
      await prisma.supplier.update({ where: { id: supplierId }, data: { isVerified: true } });
      return successResponse({ message: 'Supplier verified' });
    }

    if (action === 'unverify') {
      await prisma.supplier.update({ where: { id: supplierId }, data: { isVerified: false } });
      return successResponse({ message: 'Supplier unverified' });
    }

    if (action === 'toggleActive') {
      const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
      await prisma.supplier.update({ where: { id: supplierId }, data: { isActive: !supplier.isActive } });
      return successResponse({ message: 'Supplier status toggled' });
    }

    if (action === 'updateCodSettings') {
      const updateData = {};
      if (codEnabled !== undefined) updateData.codEnabled = codEnabled;
      if (codThreshold !== undefined) updateData.codThreshold = codThreshold;
      if (processingSlaHours !== undefined) updateData.processingSlaHours = processingSlaHours;
      if (pickupSlaHours !== undefined) updateData.pickupSlaHours = pickupSlaHours;
      if (autoCancelEnabled !== undefined) updateData.autoCancelEnabled = autoCancelEnabled;
      if (responseSlaHours !== undefined) updateData.responseSlaHours = responseSlaHours;

      await prisma.supplier.update({
        where: { id: supplierId },
        data: updateData,
      });
      return successResponse({ message: 'COD & SLA settings updated' });
    }

    if (action === 'updateShopHours') {
      await prisma.supplierSettings.upsert({
        where: { supplierId },
        create: {
          supplierId,
          shopOpenTime: shopOpenTime || null,
          shopCloseTime: shopCloseTime || null,
          shopOpenDays: shopOpenDays || null,
        },
        update: {
          shopOpenTime: shopOpenTime || null,
          shopCloseTime: shopCloseTime || null,
          shopOpenDays: shopOpenDays || null,
        },
      });
      return successResponse({ message: 'Shop hours updated' });
    }

    return errorResponse("Invalid action", 400);
  } catch (error) {
    return errorResponse("Failed to update supplier", 500);
  }
}