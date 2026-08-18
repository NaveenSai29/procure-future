import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id }
    });
    if (!supplierStaff) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    const photos = await prisma.supplierPhoto.findMany({
      where: { supplierId: supplierStaff.supplierId },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, url: true, sortOrder: true },
    });

    return NextResponse.json({ success: true, photos });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id }
    });
    if (!supplierStaff) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get('photo');

    if (!file) {
      return NextResponse.json({ error: 'No photo provided' }, { status: 400 });
    }

    // Check photo count
    const existingCount = await prisma.supplierPhoto.count({
      where: { supplierId: supplierStaff.supplierId },
    });

    if (existingCount >= 5) {
      return NextResponse.json({ error: 'Maximum 5 photos allowed. Delete a photo to add a new one.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const filename = `supplier-${supplierStaff.supplierId}-${Date.now()}.jpg`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'suppliers');
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    const url = `/uploads/suppliers/${filename}`;
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

    return NextResponse.json({ success: true, photo });
  } catch (error) {
    console.error('Photo upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id }
    });
    if (!supplierStaff) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('photoId');

    if (!photoId) {
      return NextResponse.json({ error: 'Photo ID required' }, { status: 400 });
    }

    // Check photo belongs to this supplier
    const photo = await prisma.supplierPhoto.findFirst({
      where: { id: photoId, supplierId: supplierStaff.supplierId },
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    await prisma.supplierPhoto.delete({ where: { id: photoId } });

    return NextResponse.json({ success: true, message: 'Photo deleted' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}