import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { CommissionService } from '@/services/commission.service';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const staff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id }
    });

    if (!staff) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const rate = await CommissionService.getSupplierCommissionRate();
    return NextResponse.json({ supplierRate: rate });
  } catch (error) {
    console.error('Supplier commission error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch commission rate' },
      { status: 500 }
    );
  }
}