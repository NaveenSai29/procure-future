import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const buyerProfile = await prisma.buyerProfile.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    });

    if (!buyerProfile) return successResponse([]);

    const addresses = await prisma.address.findMany({
      where: { buyerId: buyerProfile.id },
      orderBy: { isDefault: "desc" },
    });

    return successResponse(addresses);
  } catch (error) {
    console.error("Addresses GET error:", error);
    return errorResponse("Failed to fetch addresses", 500);
  }
}

export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const body = await request.json();
    const { label, name, mobile, address, city, state, pincode, latitude, longitude } = body;

    if (!address || !city) {
      return errorResponse("Address and city are required", 422);
    }

    let buyerProfile = await prisma.buyerProfile.findUnique({
      where: { userId: session.userId },
    });
    if (!buyerProfile) {
      buyerProfile = await prisma.buyerProfile.create({
        data: { userId: session.userId, buyerType: "INDIVIDUAL" },
      });
    }

    const count = await prisma.address.count({ where: { buyerId: buyerProfile.id } });

    const addr = await prisma.address.create({
      data: {
        buyerId: buyerProfile.id,
        label: label || "Other",
        fullName: name || "User",
        mobile: mobile || "",
        addressLine1: address,
        city: city || "",
        state: state || "",
        pincode: pincode || "",
        latitude: latitude || null,
        longitude: longitude || null,
        isDefault: count === 0,
      },
    });

    return successResponse(addr, 201);
  } catch (error) {
    console.error("Addresses POST error:", error);
    return errorResponse("Failed to create address", 500);
  }
}