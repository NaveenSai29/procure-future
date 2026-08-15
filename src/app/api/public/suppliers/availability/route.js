import prisma from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/auth";

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get("lat"));
    const lng = parseFloat(searchParams.get("lng"));

    if (!lat || !lng) {
      return errorResponse("Latitude and longitude required", 400);
    }

    // Get max distance setting
    const setting = await prisma.systemSetting.findFirst({
      where: { category: 'DELIVERY', key: 'maxDistance' },
    });
    const maxDistance = setting ? parseFloat(setting.value) : 200;

    // Get all active suppliers with warehouse coordinates
    const suppliers = await prisma.supplier.findMany({
      where: {
        isActive: true,
        isVerified: true,
        warehouses: {
          some: {
            isActive: true,
            latitude: { not: null },
            longitude: { not: null },
          },
        },
      },
      select: {
        id: true,
        businessName: true,
        warehouses: {
          where: { isActive: true, latitude: { not: null }, longitude: { not: null } },
          take: 1,
          select: { latitude: true, longitude: true, city: true, state: true },
        },
      },
    });

    // Filter suppliers by distance
    const nearbySuppliers = suppliers.filter(s => {
      const w = s.warehouses[0];
      if (!w?.latitude || !w?.longitude) return false;
      const distance = haversineDistance(lat, lng, w.latitude, w.longitude);
      return distance <= maxDistance;
    });

    const nearestSupplier = nearbySuppliers.length > 0 
      ? nearbySuppliers.reduce((nearest, s) => {
          const w = s.warehouses[0];
          const d = haversineDistance(lat, lng, w.latitude, w.longitude);
          if (!nearest || d < nearest.distance) {
            return { 
              id: s.id, 
              businessName: s.businessName, 
              city: w.city, 
              state: w.state,
              distance: Math.round(d * 10) / 10,
            };
          }
          return nearest;
        }, null)
      : null;

    return successResponse({
      hasSuppliers: nearbySuppliers.length > 0,
      supplierCount: nearbySuppliers.length,
      nearestSupplier,
      maxDistance,
    });
  } catch (error) {
    console.error("Availability check error:", error);
    return errorResponse("Failed to check availability", 500);
  }
}