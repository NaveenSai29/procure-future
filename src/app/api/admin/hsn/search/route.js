// src/app/api/admin/hsn/search/route.js

import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Search HSN codes for autocomplete
export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '20');

    if (q.length < 1) {
      return NextResponse.json({ success: true, data: [] });
    }

    const hsnCodes = await prisma.hsnCode.findMany({
      where: {
        isActive: true,
        OR: [
          { code: { startsWith: q } },
          { description: { contains: q } },
          { section: { contains: q } },
        ],
      },
      take: limit,
      select: {
        code: true,
        description: true,
        gstRate: true,
        section: true,
      },
      orderBy: { code: 'asc' },
    });

    return NextResponse.json({ success: true, data: hsnCodes });
  } catch (error) {
    console.error('HSN Search Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}