import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - List all categories with hierarchy
export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminProfile = await prisma.adminProfile.findFirst({
      where: { userId: user.id }
    });
    if (!adminProfile) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const parentOnly = searchParams.get('parentOnly') === 'true';
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const tree = searchParams.get('tree') === 'true';

    const where = {};
    if (!includeInactive) where.isActive = true;
    if (parentOnly) where.parentId = null;

    if (tree) {
      // Return full category tree
      const categories = await prisma.category.findMany({
        where: { parentId: null },
        include: {
          children: {
            include: {
              children: true,
              _count: { select: { products: true } }
            },
            orderBy: { sortOrder: 'asc' }
          },
          _count: { select: { products: true } }
        },
        orderBy: { sortOrder: 'asc' }
      });
      return NextResponse.json({ categories, mode: 'tree' });
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { products: true, children: true } }
      },
      orderBy: { sortOrder: 'asc' }
    });

    return NextResponse.json({ categories, total: categories.length });
  } catch (error) {
    console.error('Admin categories error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create category
export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminProfile = await prisma.adminProfile.findFirst({
      where: { userId: user.id }
    });
    if (!adminProfile) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const body = await request.json();
    const { name, description, image, parentId, sortOrder, isActive } = body;

    // Generate slug
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Check for duplicate slug
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: 'Category with this name already exists' }, { status: 400 });
    }

    // If parentId provided, verify it exists
    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parent) {
        return NextResponse.json({ error: 'Parent category not found' }, { status: 404 });
      }
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description: description || null,
        image: image || null,
        parentId: parentId || null,
        sortOrder: sortOrder || 0,
        isActive: isActive !== undefined ? isActive : true
      },
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { products: true, children: true } }
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE_CATEGORY',
        entity: 'Category',
        entityId: category.id,
        newValue: { name, slug, parentId },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      }
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}