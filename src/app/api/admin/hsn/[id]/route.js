// src/app/api/admin/hsn/[id]/route.js

import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET single HSN code
export async function GET(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const admin = await prisma.adminProfile.findFirst({ where: { userId: user.id } });
    if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const { id } = await params;

    const hsnCode = await prisma.hsnCode.findUnique({ where: { id } });
    if (!hsnCode) return NextResponse.json({ error: 'HSN code not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: hsnCode });
  } catch (error) {
    console.error('HSN Get Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update HSN code
export async function PUT(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const admin = await prisma.adminProfile.findFirst({ where: { userId: user.id } });
    if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.hsnCode.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'HSN code not found' }, { status: 404 });

    const hsnCode = await prisma.hsnCode.update({
      where: { id },
      data: {
        code: body.code || existing.code,
        description: body.description || existing.description,
        chapter: body.chapter || existing.chapter,
        section: body.section !== undefined ? body.section : existing.section,
        gstRate: body.gstRate !== undefined ? parseFloat(body.gstRate) : existing.gstRate,
        cess: body.cess !== undefined ? parseFloat(body.cess) : existing.cess,
        isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'HSN_UPDATE',
        entity: 'HsnCode',
        entityId: hsnCode.id,
        oldValue: { code: existing.code, description: existing.description, gstRate: existing.gstRate },
        newValue: { code: hsnCode.code, description: hsnCode.description, gstRate: hsnCode.gstRate },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      },
    });

    return NextResponse.json({ success: true, data: hsnCode, message: 'HSN code updated' });
  } catch (error) {
    console.error('HSN Update Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Soft delete HSN code
export async function DELETE(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const admin = await prisma.adminProfile.findFirst({ where: { userId: user.id } });
    if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const { id } = await params;

    const existing = await prisma.hsnCode.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'HSN code not found' }, { status: 404 });

    // Soft delete by setting inactive
    const hsnCode = await prisma.hsnCode.update({
      where: { id },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'HSN_DELETE',
        entity: 'HsnCode',
        entityId: hsnCode.id,
        oldValue: { code: hsnCode.code },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      },
    });

    return NextResponse.json({ success: true, message: 'HSN code deactivated' });
  } catch (error) {
    console.error('HSN Delete Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}