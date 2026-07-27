import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { WarehouseService } from '@/services/warehouse.service';

export async function GET(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { binId } = await params;
    const bin = await WarehouseService.getBin(binId);
    if (!bin) return NextResponse.json({ error: 'Bin not found' }, { status: 404 });

    return NextResponse.json(bin);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { binId } = await params;
    const body = await request.json();
    const bin = await WarehouseService.updateBin(binId, body);

    return NextResponse.json(bin);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { binId } = await params;
    await WarehouseService.deleteBin(binId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}