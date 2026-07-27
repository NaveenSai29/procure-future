import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { WarehouseService } from '@/services/warehouse.service';

// GET - List zones for warehouse
export async function GET(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: warehouseId } = await params;

    const zones = await WarehouseService.getZones(warehouseId);
    const analytics = await WarehouseService.getWarehouseAnalytics(warehouseId);
    const utilization = await WarehouseService.getStorageUtilization(warehouseId);

    return NextResponse.json({ zones, analytics, utilization });
  } catch (error) {
    console.error('Get zones error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create zone
export async function POST(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: warehouseId } = await params;
    const body = await request.json();
    const zone = await WarehouseService.createZone(warehouseId, body);

    return NextResponse.json(zone, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}