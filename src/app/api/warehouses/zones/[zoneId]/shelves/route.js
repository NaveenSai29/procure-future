import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { WarehouseService } from '@/services/warehouse.service';

export async function GET(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { zoneId } = await params;
    const shelves = await WarehouseService.getShelves(zoneId);

    return NextResponse.json(shelves);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { zoneId } = await params;
    const body = await request.json();
    const shelf = await WarehouseService.createShelf(zoneId, body);

    return NextResponse.json(shelf, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}