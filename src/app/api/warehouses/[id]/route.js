import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

async function getSupplierId(userId) {
  const staff = await prisma.supplierStaff.findFirst({ where: { userId } });
  if (staff) return staff.supplierId;
  const userWithRoles = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  });
  if (userWithRoles) {
    const hasSupplierRole = userWithRoles.roles.some(r => r.role.name === 'SUPPLIER');
    if (hasSupplierRole) {
      const supplier = await prisma.supplier.findFirst({ where: { email: userWithRoles.email } });
      if (supplier) return supplier.id;
    }
  }
  return null;
}

export async function GET(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);
    const { id } = await params;
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        inventory: { include: { product: { select: { name: true, sku: true } } } },
        zones: true,
      },
    });
    if (!warehouse) return errorResponse("Warehouse not found", 404);
    return successResponse(warehouse);
  } catch (error) {
    console.error("Warehouse detail error:", error);
    return errorResponse("Failed to fetch warehouse", 500);
  }
}

export async function PATCH(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { id } = await params;

    // Verify supplier owns this warehouse
    const sid = await getSupplierId(session.userId);
    if (!sid) return errorResponse("Supplier account required", 403);

    const existing = await prisma.warehouse.findUnique({ where: { id } });
    if (!existing) return errorResponse("Warehouse not found", 404);
    if (existing.supplierId !== sid) return errorResponse("Access denied", 403);

    const body = await request.json();
    const { name, addressLine1, addressLine2, city, state, pincode, latitude, longitude, isActive, isPickupLocation } = body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (addressLine1 !== undefined) updateData.addressLine1 = addressLine1;
    if (addressLine2 !== undefined) updateData.addressLine2 = addressLine2;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (pincode !== undefined) updateData.pincode = pincode;
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isPickupLocation !== undefined) updateData.isPickupLocation = isPickupLocation;

    if (Object.keys(updateData).length === 0) {
      return errorResponse("No fields to update", 400);
    }

    const warehouse = await prisma.warehouse.update({ where: { id }, data: updateData });
    return successResponse({ warehouse, message: "Warehouse updated" });
  } catch (error) {
    console.error("Update warehouse error:", error);
    return errorResponse("Failed to update warehouse", 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);
    const { id } = await params;

    const sid = await getSupplierId(session.userId);
    if (!sid) return errorResponse("Supplier account required", 403);

    const existing = await prisma.warehouse.findUnique({ where: { id } });
    if (!existing) return errorResponse("Warehouse not found", 404);
    if (existing.supplierId !== sid) return errorResponse("Access denied", 403);

    await prisma.warehouse.delete({ where: { id } });
    return successResponse({ message: "Warehouse deleted" });
  } catch (error) {
    console.error("Delete warehouse error:", error);
    return errorResponse("Failed to delete warehouse", 500);
  }
}