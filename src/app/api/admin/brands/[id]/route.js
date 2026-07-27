import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

// PATCH - Update brand
export async function PATCH(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminProfile = await prisma.adminProfile.findFirst({
      where: { userId: user.id }
    });
    if (!adminProfile) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();

    const brand = await prisma.brand.update({
      where: { id },
      data: body,
      include: {
        _count: { select: { products: true } }
      }
    });

    return NextResponse.json(brand);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete brand
export async function DELETE(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminProfile = await prisma.adminProfile.findFirst({
      where: { userId: user.id }
    });
    if (!adminProfile) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const { id } = await params;

    const productCount = await prisma.product.count({ where: { brandId: id } });
    if (productCount > 0) {
      return NextResponse.json({
        error: `Cannot delete brand with ${productCount} products. Reassign products first.`
      }, { status: 400 });
    }

    await prisma.brand.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}