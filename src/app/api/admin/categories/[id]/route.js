import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Single category with details
export async function GET(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: {
          include: { _count: { select: { products: true } } },
          orderBy: { sortOrder: 'asc' }
        },
        products: {
          select: { id: true, name: true, isActive: true },
          take: 20
        },
        _count: { select: { products: true } }
      }
    });

    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    return NextResponse.json(category);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Update category
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
    const { name, description, image, parentId, sortOrder, isActive } = body;

    const updateData = {};
    if (name !== undefined) {
      updateData.name = name;
      updateData.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = image;
    if (parentId !== undefined) updateData.parentId = parentId || null;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Prevent circular parent reference
    if (parentId === id) {
      return NextResponse.json({ error: 'Category cannot be its own parent' }, { status: 400 });
    }

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
      include: {
        parent: { select: { id: true, name: true } },
        children: true,
        _count: { select: { products: true } }
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE_CATEGORY',
        entity: 'Category',
        entityId: id,
        oldValue: body,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      }
    });

    return NextResponse.json(category);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Soft delete category
export async function DELETE(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminProfile = await prisma.adminProfile.findFirst({
      where: { userId: user.id }
    });
    if (!adminProfile) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const { id } = await params;

    // Check for children
    const childCount = await prisma.category.count({ where: { parentId: id } });
    if (childCount > 0) {
      return NextResponse.json({
        error: `Cannot delete category with ${childCount} subcategories. Remove or reassign them first.`
      }, { status: 400 });
    }

    // Check for products
    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      return NextResponse.json({
        error: `Cannot delete category with ${productCount} products. Reassign products first.`
      }, { status: 400 });
    }

    await prisma.category.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'DELETE_CATEGORY',
        entity: 'Category',
        entityId: id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}