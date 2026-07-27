// src/app/api/admin/hsn/export/route.js

import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Export HSN codes as CSV
export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const admin = await prisma.adminProfile.findFirst({ where: { userId: user.id } });
    if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const chapter = searchParams.get('chapter') || '';
    const section = searchParams.get('section') || '';

    const where = { isActive: true };
    if (chapter) where.chapter = chapter;
    if (section) where.section = section;

    const hsnCodes = await prisma.hsnCode.findMany({
      where,
      orderBy: { code: 'asc' },
    });

    if (format === 'json') {
      return NextResponse.json({ success: true, data: hsnCodes });
    }

    // Generate CSV
    const headers = ['HSN Code', 'Description', 'Chapter', 'Section', 'GST Rate (%)', 'Cess (%)', 'Status'];
    const csvRows = [headers.join(',')];

    hsnCodes.forEach(item => {
      csvRows.push([
        `"${item.code}"`,
        `"${item.description.replace(/"/g, '""')}"`,
        `"${item.chapter}"`,
        `"${item.section || ''}"`,
        item.gstRate,
        item.cess,
        item.isActive ? 'Active' : 'Inactive',
      ].join(','));
    });

    const csv = csvRows.join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=hsn-codes-export-${new Date().toISOString().split('T')[0]}.csv`,
      },
    });
  } catch (error) {
    console.error('HSN Export Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}