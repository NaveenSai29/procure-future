import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - List all brands
export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminProfile = await prisma.adminProfile.findFirst({
      where: { userId: user.id }
    });
    if (!adminProfile) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create brand
export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminProfile = await prisma.adminProfile.findFirst({
      where: { userId: user.id }
    });
    if (!adminProfile) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const body = await request.json();
    const { name, logo, description, website, isActive } = body;

    // Check duplicate
    const existing = await prisma.brand.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: 'Brand already exists' }, { status: 400 });
    }

    const brand = await prisma.brand.create({
      data: {
        name,
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
        newValue: { name },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      }
    });

    return NextResponse.json(brand, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}