import { NextResponse } from 'next/server';
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { roles: { include: { role: true } } },
    });
    const userRoles = user.roles.map(r => r.role.name);
    if (!userRoles.includes("SUPER_ADMIN") && !userRoles.includes("ADMIN")) {
      return NextResponse.json({ success: false, message: "Access denied" }, { status: 403 });
    }

    const [warehousesWithCoords, warehousesWithoutCoords, deliveryPartners, activeDeliveries] = await Promise.all([
      prisma.warehouse.findMany({
        where: { latitude: { not: null }, longitude: { not: null } },
        select: { 
          id: true, name: true, city: true, state: true, latitude: true, longitude: true, 
          isPickupLocation: true, 
          supplier: { select: { id: true, businessName: true, isVerified: true } } 
        },
      }),
      prisma.warehouse.findMany({
        where: { OR: [{ latitude: null }, { longitude: null }] },
        select: { id: true, name: true, city: true, state: true, isPickupLocation: true, supplier: { select: { businessName: true } } },
      }),
      prisma.deliveryPartner.findMany({
        where: { isOnline: true, currentLat: { not: null }, currentLng: { not: null } },
        select: { 
          id: true, currentLat: true, currentLng: true, rating: true, totalDeliveries: true, 
          activeVehicle: { select: { vehicleType: true, vehicleNumber: true } },
          vehicles: { take: 1, orderBy: { createdAt: 'desc' }, select: { vehicleType: true, vehicleNumber: true } },
          user: { select: { name: true, mobile: true } } 
        },
      }),
      prisma.delivery.findMany({
        where: { status: { in: ['ACCEPTED', 'PICKED_UP'] } },
        include: {
          order: {
            select: {
              id: true, totalAmount: true, deliveryFee: true, paymentMethod: true,
              buyer: { select: { name: true } },
              product: {
                select: {
                  supplier: {
                    select: {
                      warehouses: { where: { isActive: true, isPickupLocation: true }, take: 1, select: { latitude: true, longitude: true, name: true, city: true } },
                    },
                  },
                },
              },
            },
          },
          partner: {
            select: { 
              id: true, currentLat: true, currentLng: true, 
              activeVehicle: { select: { vehicleType: true, vehicleNumber: true } },
              vehicles: { take: 1, orderBy: { createdAt: 'desc' }, select: { vehicleType: true, vehicleNumber: true } },
              user: { select: { name: true } } 
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    // Auto-set displayVehicle for partners without activeVehicle
    const safeDeliveryPartners = deliveryPartners.map(dp => ({
      ...dp,
      displayVehicle: dp.activeVehicle || dp.vehicles?.[0] || null,
    }));

    const safeActiveDeliveries = activeDeliveries.map(d => ({
      ...d,
      partner: d.partner ? {
        ...d.partner,
        displayVehicle: d.partner.activeVehicle || d.partner.vehicles?.[0] || null,
      } : null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        warehouses: warehousesWithCoords,
        warehousesWithoutCoords,
        deliveryPartners: safeDeliveryPartners,
        activeDeliveries: safeActiveDeliveries,
        stats: {
          totalWarehouses: warehousesWithCoords.length + warehousesWithoutCoords.length,
          onMap: warehousesWithCoords.length,
          withoutLocation: warehousesWithoutCoords.length,
          onlineDrivers: safeDeliveryPartners.length,
          activeDeliveries: safeActiveDeliveries.length,
        },
      }
    });
  } catch (error) {
    console.error("Map data error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch map data" }, { status: 500 });
  }
}