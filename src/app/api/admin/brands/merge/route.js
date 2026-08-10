import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

// POST - Merge two brands
export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminProfile = await prisma.adminProfile.findFirst({ where: { userId: user.id } });
    if (!adminProfile) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const body = await request.json();
    const { sourceBrandId, targetBrandId } = body;

    if (!sourceBrandId || !targetBrandId) {
      return NextResponse.json({ error: 'sourceBrandId and targetBrandId required' }, { status: 400 });
    }

    if (sourceBrandId === targetBrandId) {
      return NextResponse.json({ error: 'Cannot merge a brand into itself' }, { status: 400 });
    }

    // Verify both brands exist
    const [sourceBrand, targetBrand] = await Promise.all([
      prisma.brand.findUnique({ where: { id: sourceBrandId } }),
      prisma.brand.findUnique({ where: { id: targetBrandId } }),
    ]);

    if (!sourceBrand) return NextResponse.json({ error: 'Source brand not found' }, { status: 404 });
    if (!targetBrand) return NextResponse.json({ error: 'Target brand not found' }, { status: 404 });

    // Move all products from source to target
    const updatedProducts = await prisma.product.updateMany({
      where: { brandId: sourceBrandId },
      data: { brandId: targetBrandId },
    });

    // Delete the source brand
    await prisma.brand.delete({ where: { id: sourceBrandId } });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'MERGE_BRAND',
        entity: 'Brand',
        newValue: { 
          sourceBrandId, 
          sourceBrandName: sourceBrand.name,
          targetBrandId, 
          targetBrandName: targetBrand.name,
          productsMoved: updatedProducts.count 
        },
      },
    });

    return NextResponse.json({ 
      success: true, 
      productsMoved: updatedProducts.count,
      message: `${updatedProducts.count} products moved from "${sourceBrand.name}" to "${targetBrand.name}". Source brand deleted.`
    });
  } catch (error) {
    console.error('Brand merge error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}