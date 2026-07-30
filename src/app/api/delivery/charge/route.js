import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { DeliveryService } from '@/services/delivery.service';

export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { orderTotal, totalWeight, buyerLat, buyerLng, warehouseLat, warehouseLng, isExpress, paymentMethod } = body;

    const result = await DeliveryService.calculateCharge({
      orderTotal: orderTotal || 0,
      totalWeight: totalWeight || 0,
      buyerLat, buyerLng,
      warehouseLat, warehouseLng,
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