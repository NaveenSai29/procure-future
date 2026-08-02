import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { DeliveryService } from '@/services/delivery.service';
import prisma from '@/lib/prisma';

export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    let { orderTotal, totalWeight, buyerLat, buyerLng, warehouseLat, warehouseLng, supplierId, isExpress, paymentMethod } = body;

    // If buyer coordinates not provided, get from user's default address
    if (!buyerLat || !buyerLng) {
      const buyerProfile = await prisma.buyerProfile.findUnique({
        where: { userId: session.userId },
        select: { id: true },
      });
      if (buyerProfile) {
        const userAddress = await prisma.address.findFirst({
          where: { buyerId: buyerProfile.id, isDefault: true, latitude: { not: null }, longitude: { not: null } },
          select: { latitude: true, longitude: true },
        });
        if (userAddress) {
          buyerLat = userAddress.latitude;
          buyerLng = userAddress.longitude;
        }
      }
    }

    // If no warehouse coordinates, look up from supplier
    if (!warehouseLat || !warehouseLng) {
      if (supplierId) {
        const warehouse = await prisma.warehouse.findFirst({
          where: { supplierId, isActive: true, latitude: { not: null }, longitude: { not: null } },
          select: { latitude: true, longitude: true },
        });
        if (warehouse) {
          warehouseLat = warehouse.latitude;
          warehouseLng = warehouse.longitude;
        }
      }
    }

    const result = await DeliveryService.calculateCharge({
      orderTotal: orderTotal || 0,
      totalWeight: totalWeight || 0,
      buyerLat: buyerLat || null,
      buyerLng: buyerLng || null,
      warehouseLat: warehouseLat || null,
      warehouseLng: warehouseLng || null,
      isExpress: isExpress || false,
      paymentMethod: paymentMethod || 'ONLINE',
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Delivery charge error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to calculate delivery' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const settings = await DeliveryService.getSettings();
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch delivery settings' }, { status: 500 });
  }
}