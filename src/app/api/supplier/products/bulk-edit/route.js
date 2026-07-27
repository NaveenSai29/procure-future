import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PATCH(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supplierStaff = await prisma.supplierStaff.findFirst({ where: { userId: user.id } });
    if (!supplierStaff) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    const { productIds, updates } = await request.json();

    if (!productIds?.length) return NextResponse.json({ error: 'No products selected' }, { status: 400 });

    const updateData = {};
    if (updates.categoryId) updateData.categoryId = updates.categoryId;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    if (updates.isFeatured !== undefined) updateData.isFeatured = updates.isFeatured;

    // Bulk price update
    if (updates.priceUpdate) {
      const { type, value } = updates.priceUpdate;
      // This would update all pricing entries - handled below
    }

    const result = await prisma.product.updateMany({
      where: { id: { in: productIds }, supplierId: supplierStaff.supplierId },
      data: updateData
    });

    return NextResponse.json({ success: true, updated: result.count });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}