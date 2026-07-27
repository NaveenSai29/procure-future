import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PUT(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { branchId } = await params;
    const { businessHours } = await request.json();

    // Delete existing hours
    await prisma.businessHours.deleteMany({ where: { branchId } });

    // Create new hours
    if (businessHours?.length > 0) {
      await prisma.businessHours.createMany({
        data: businessHours.map(bh => ({
          branchId,
          dayOfWeek: bh.dayOfWeek,
          openTime: bh.openTime,
          closeTime: bh.closeTime,
          isOpen: bh.isOpen !== false
        }))
      });
    }

    const updated = await prisma.businessHours.findMany({
      where: { branchId },
      orderBy: { dayOfWeek: 'asc' }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}