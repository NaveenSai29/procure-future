import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - List all brands (admin + supplier accessible)
export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Allow admin, supplier staff, and users with SUPPLIER role
    const adminProfile = await prisma.adminProfile.findFirst({ where: { userId: user.id } });
    const supplierStaff = await prisma.supplierStaff.findFirst({ where: { userId: user.id } });
    const hasSupplierRole = user.roles?.some(r => r.role?.name === 'SUPPLIER');
    if (!adminProfile && !supplierStaff && !hasSupplierRole) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where = {};
    if (search) {
      where.name = { contains: search };
    }

    const [brands, total] = await Promise.all([
      prisma.brand.findMany({
        where,
        include: {
          _count: { select: { products: true } }
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.brand.count({ where })
    ]);

    return NextResponse.json({
      brands,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Brand GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create brand (admin + supplier accessible)
export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Allow admin, supplier staff, and users with SUPPLIER role
    const adminProfile = await prisma.adminProfile.findFirst({ where: { userId: user.id } });
    const supplierStaff = await prisma.supplierStaff.findFirst({ where: { userId: user.id } });
    const hasSupplierRole = user.roles?.some(r => r.role?.name === 'SUPPLIER');
    if (!adminProfile && !supplierStaff && !hasSupplierRole) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { name, logo, description, website, isActive } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Brand name is required' }, { status: 400 });
    }

    // Check duplicate
    const existing = await prisma.brand.findFirst({ 
      where: { name: { equals: name.trim() } } 
    });
    if (existing) {
      // Return the existing brand instead of error
      return NextResponse.json({ error: 'Brand already exists', id: existing.id, name: existing.name });
    }

    const brand = await prisma.brand.create({
      data: {
        name: name.trim(),
        logo: logo || null,
        description: description || null,
        website: website || null,
        isActive: isActive !== undefined ? isActive : true
      },
      include: {
        _count: { select: { products: true } }
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE_BRAND',
        entity: 'Brand',
        entityId: brand.id,
        newValue: { name: name.trim(), createdBy: adminProfile ? 'admin' : 'supplier' },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      }
    });

    return NextResponse.json(brand, { status: 201 });
  } catch (error) {
    console.error('Brand POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}