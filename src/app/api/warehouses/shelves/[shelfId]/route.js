import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { WarehouseService } from '@/services/warehouse.service';

export async function GET(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { shelfId } = await params;
    const shelf = await WarehouseService.getShelf(shelfId);
    if (!shelf) return NextResponse.json({ error: 'Shelf not found' }, { status: 404 });

    return NextResponse.json(shelf);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { shelfId } = await params;
    const body = await request.json();
    const shelf = await WarehouseService.updateShelf(shelfId, body);

    return NextResponse.json(shelf);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { shelfId } = await params;
    await WarehouseService.deleteShelf(shelfId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}