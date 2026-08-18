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

    await prisma.supplier.update({
      where: { id: supplierStaff.supplierId },
      data: { coverVideo: url },
    });

    // Save to Media library
    await prisma.media.create({
      data: {
        fileName: url.split('/').pop(),
        originalName: url.split('/').pop(),
        fileUrl: url,
        fileType: 'SUPPLIER_VIDEO',
        fileSize: 0,
        entityType: 'SUPPLIER',
        entityId: supplierStaff.supplierId,
        uploadedBy: user.id,
      },
    });

    return NextResponse.json({ success: true, coverVideo: url });
  } catch (error) {
    console.error('Save video error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}