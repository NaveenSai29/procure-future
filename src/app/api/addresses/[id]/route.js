import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

export async function PATCH(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { id } = await params;
    const body = await request.json();

    const buyerProfile = await prisma.buyerProfile.findUnique({
      where: { userId: session.userId },
    });
    if (!buyerProfile) return errorResponse("Buyer not found", 404);

    const existing = await prisma.address.findFirst({
      where: { id, buyerId: buyerProfile.id },
    });
    if (!existing) return errorResponse("Address not found", 404);

    if (body.isDefault) {
      await prisma.address.updateMany({
        where: { buyerId: buyerProfile.id },
        data: { isDefault: false },
      });
    }

    const addr = await prisma.address.update({
      where: { id },
      data: {
        ...(body.label && { label: body.label }),
        ...(body.name && { fullName: body.name }),
        ...(body.mobile && { mobile: body.mobile }),
        ...(body.address && { addressLine1: body.address }),
        ...(body.city && { city: body.city }),
        ...(body.state && { state: body.state }),
        ...(body.pincode && { pincode: body.pincode }),
        ...(body.latitude !== undefined && { latitude: body.latitude }),
        ...(body.longitude !== undefined && { longitude: body.longitude }),
        ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
      },
    });

    return successResponse(addr);
  } catch (error) {
    console.error("Address PATCH error:", error);
    return errorResponse("Failed to update address", 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { id } = await params;

    const buyerProfile = await prisma.buyerProfile.findUnique({
      where: { userId: session.userId },
    });
    if (!buyerProfile) return errorResponse("Buyer not found", 404);

    await prisma.address.deleteMany({
      where: { id, buyerId: buyerProfile.id },
    });

    return successResponse({ message: "Deleted" });
  } catch (error) {
    console.error("Address DELETE error:", error);
    return errorResponse("Failed to delete address", 500);
  }
}