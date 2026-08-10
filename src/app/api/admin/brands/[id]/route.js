import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

// PATCH - Update brand
export async function PATCH(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Allow both admin and supplier staff
    const adminProfile = await prisma.adminProfile.findFirst({ where: { userId: user.id } });
    const supplierStaff = await prisma.supplierStaff.findFirst({ where: { userId: user.id } });
    if (!adminProfile && !supplierStaff) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Check duplicate name
    if (body.name) {
      const existing = await prisma.brand.findFirst({
        where: { 
          name: { equals: body.name, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (existing) {
        return NextResponse.json({ error: 'Brand with this name already exists' }, { status: 400 });
      }
    }

    const brand = await prisma.brand.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.logo !== undefined && { logo: body.logo }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.website !== undefined && { website: body.website }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      include: {
        _count: { select: { products: true } }
      }
    });

    return NextResponse.json(brand);
  } catch (error) {
    console.error('Brand update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete brand
export async function DELETE(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Allow both admin and supplier staff
    const adminProfile = await prisma.adminProfile.findFirst({ where: { userId: user.id } });
    const supplierStaff = await prisma.supplierStaff.findFirst({ where: { userId: user.id } });
    if (!adminProfile && !supplierStaff) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

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
    console.error('Brand delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}