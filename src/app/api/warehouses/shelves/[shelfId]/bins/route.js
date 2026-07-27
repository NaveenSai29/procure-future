import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { WarehouseService } from '@/services/warehouse.service';

export async function GET(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { shelfId } = await params;
    const bins = await WarehouseService.getBins(shelfId);

    return NextResponse.json(bins);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { shelfId } = await params;
    const body = await request.json();
    const bin = await WarehouseService.createBin(shelfId, body);

    return NextResponse.json(bin, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}