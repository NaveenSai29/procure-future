import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id }
    });
    if (!supplierStaff) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL required' }, { status: 400 });
    }

    // Check photo count
    const existingCount = await prisma.supplierPhoto.count({
      where: { supplierId: supplierStaff.supplierId },
    });

    if (existingCount >= 5) {
      return NextResponse.json({ error: 'Maximum 5 photos allowed' }, { status: 400 });
    }

    const maxSortOrder = await prisma.supplierPhoto.findFirst({
      where: { supplierId: supplierStaff.supplierId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const photo = await prisma.supplierPhoto.create({
      data: {
        supplierId: supplierStaff.supplierId,
        url,
        sortOrder: (maxSortOrder?.sortOrder || 0) + 1,
      },
    });

    // Save to Media library
    await prisma.media.create({
      data: {
        fileName: url.split('/').pop(),
        originalName: url.split('/').pop(),
        fileUrl: url,
        fileType: 'SUPPLIER_PHOTO',
        fileSize: 0,
        entityType: 'SUPPLIER',
        entityId: supplierStaff.supplierId,
        uploadedBy: user.id,
      },
    });

    return NextResponse.json({ success: true, photo });
  } catch (error) {
    console.error('Save photo error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}