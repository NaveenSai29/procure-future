import { NextResponse } from 'next/server';
import { DeliveryService } from '@/services/delivery.service';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const originLat = parseFloat(searchParams.get('originLat'));
    const originLng = parseFloat(searchParams.get('originLng'));
    const destLat = parseFloat(searchParams.get('destLat'));
    const destLng = parseFloat(searchParams.get('destLng'));

    if (!originLat || !originLng || !destLat || !destLng) {
      return NextResponse.json({ success: false, message: 'Missing coordinates' }, { status: 400 });
    }

    const eta = await DeliveryService.getMapETA({ originLat, originLng, destLat, destLng });
    return NextResponse.json({ success: true, data: eta });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}