import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { roles: { include: { role: true } } },
    });
    const userRoles = user.roles.map(r => r.role.name);
    if (!userRoles.includes("SUPER_ADMIN") && !userRoles.includes("ADMIN")) {
      return errorResponse("Access denied", 403);
    }

    const [warehousesWithCoords, warehousesWithoutCoords, deliveryPartners, suppliers] = await Promise.all([
      prisma.warehouse.findMany({
        where: { latitude: { not: null }, longitude: { not: null } },
        select: { id: true, name: true, city: true, state: true, addressLine1: true, latitude: true, longitude: true, supplier: { select: { businessName: true } } },
      }),
      prisma.warehouse.findMany({
        where: { OR: [{ latitude: null }, { longitude: null }] },
        select: { id: true, name: true, city: true, state: true, addressLine1: true, supplier: { select: { businessName: true } } },
      }),
      prisma.deliveryPartner.findMany({
        where: { isOnline: true, currentLat: { not: null }, currentLng: { not: null } },
        select: { id: true, vehicleType: true, vehicleNumber: true, currentLat: true, currentLng: true, rating: true, user: { select: { name: true } } },
      }),
      prisma.supplier.findMany({
        where: { isActive: true, isVerified: true },
        select: { id: true, businessName: true, branches: { select: { city: true, state: true } }, _count: { select: { products: true, warehouses: true } } },
      }),
    ]);

    return successResponse({
      warehouses: warehousesWithCoords,
      warehousesWithoutCoords,
      deliveryPartners,
      suppliers,
      stats: {
        totalWarehouses: warehousesWithCoords.length + warehousesWithoutCoords.length,
        onMap: warehousesWithCoords.length,
        withoutLocation: warehousesWithoutCoords.length,
        onlineDrivers: deliveryPartners.length,
      },
    });
  } catch (error) {
    console.error("Map data error:", error);
    return errorResponse("Failed to fetch map data", 500);
  }
}