import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

// GET - Single warehouse with inventory
export async function GET(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { id } = await params;

    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        inventory: {
          include: {
            product: { select: { name: true, sku: true } },
          },
        },
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

// PATCH - Update warehouse
export async function PATCH(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { id } = await params;
    const body = await request.json();
    const { name, addressLine1, addressLine2, city, state, pincode, isActive } = body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (addressLine1 !== undefined) updateData.addressLine1 = addressLine1;
    if (addressLine2 !== undefined) updateData.addressLine2 = addressLine2;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (pincode !== undefined) updateData.pincode = pincode;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (Object.keys(updateData).length === 0) {
      return errorResponse("No fields to update", 400);
    }

    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: updateData,
    });

    return successResponse({ warehouse, message: "Warehouse updated" });
  } catch (error) {
    console.error("Update warehouse error:", error);
    return errorResponse("Failed to update warehouse", 500);
  }
}

// DELETE - Remove warehouse
export async function DELETE(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { id } = await params;

    await prisma.warehouse.delete({ where: { id } });

    return successResponse({ message: "Warehouse deleted" });
  } catch (error) {
    console.error("Delete warehouse error:", error);
    return errorResponse("Failed to delete warehouse", 500);
  }
}