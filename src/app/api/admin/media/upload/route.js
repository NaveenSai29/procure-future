import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3',
];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.pdf', '.doc', '.docx', '.mp3', '.wav', '.ogg'];

export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file');
    const entityType = formData.get('entityType') || 'GENERAL';
    const entityId = formData.get('entityId') || 'manual-upload';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (5MB limit)
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return NextResponse.json({ 
        error: `File too large (${sizeMB}MB). Maximum 5MB allowed.` 
      }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type) && file.type !== '') {
      return NextResponse.json({ 
        error: `File type "${file.type}" not allowed. Accepted: JPG, PNG, GIF, WebP, SVG, PDF, DOC, DOCX, MP3, WAV, OGG` 
      }, { status: 400 });
    }

    // Validate extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ 
        error: `File extension "${ext}" not allowed. Accepted: ${ALLOWED_EXTENSIONS.join(', ')}` 
      }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename with sanitized original name
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${entityType.toLowerCase()}-${Date.now()}-${safeName}`;
    
    // Use entity-specific folder
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', entityType.toLowerCase());
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, fileName), buffer);

    const url = `/uploads/${entityType.toLowerCase()}/${fileName}`;

    // Save to media library
    const media = await prisma.media.create({
      data: {
        fileName,
        originalName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: buffer.length,
        fileUrl: url,
        entityType,
        entityId,
        uploadedBy: user.id,
      },
    });

    return NextResponse.json({ 
      success: true, 
      url, 
      media,
      size: `${(buffer.length / 1024).toFixed(1)} KB`,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}