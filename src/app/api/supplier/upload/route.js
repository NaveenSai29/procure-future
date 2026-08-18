import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { userId: user.id }
    });
    if (!supplierStaff) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get('file');
    const type = formData.get('type'); // 'logo' or 'banner'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!type || !['logo', 'banner'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type. Must be "logo" or "banner"' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileExt = file.name?.split('.').pop() || 'jpg';
    const filename = `supplier-${type}-${supplierStaff.supplierId}-${Date.now()}.${fileExt}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'suppliers');
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    const url = `/uploads/suppliers/${filename}`;

    // Just return the URL - DON'T save to DB yet
    // Will be saved when "Save Branding" is clicked
    return NextResponse.json({ success: true, url, type });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}