import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { WarehouseService } from '@/services/warehouse.service';

export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const inventoryId = searchParams.get('inventoryId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!inventoryId) {
      return NextResponse.json({ error: 'inventoryId required' }, { status: 400 });
    }

    const result = await WarehouseService.getMovements(inventoryId, { page, limit });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { inventoryId, type, quantity, referenceType, referenceId, notes } = body;

    const movement = await WarehouseService.recordMovement(inventoryId, {
      type,
      quantity,
      referenceType,
      referenceId,
      notes
    });

    return NextResponse.json(movement, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}