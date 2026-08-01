import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file');
    const entityType = formData.get('entityType') || 'BRANDING';
    const entityId = formData.get('entityId') || 'rider-icon';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const ext = file.name.split('.').pop();
    const fileName = `${entityType.toLowerCase()}-${Date.now()}.${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'branding');
    
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, fileName), buffer);

    const url = `/uploads/branding/${fileName}`;

    // Save to media library
    const media = await prisma.media.create({
        data: {
        fileName,
        originalName: file.name,
        fileType: file.type,
        fileSize: buffer.length,
        fileUrl: url,
        entityType,
        entityId,
        uploadedBy: user.id,
      },
    });

    return NextResponse.json({ success: true, url, media });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}