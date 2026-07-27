// src/app/api/admin/hsn/stats/route.js

import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const admin = await prisma.adminProfile.findFirst({ where: { userId: user.id } });
    if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const [totalCodes, activeCodes, chapterBreakdown, gstRateBreakdown, sectionBreakdown] = await Promise.all([
      prisma.hsnCode.count(),
      prisma.hsnCode.count({ where: { isActive: true } }),
      prisma.hsnCode.groupBy({
        by: ['chapter'],
        _count: { id: true },
        orderBy: { chapter: 'asc' },
      }),
      prisma.hsnCode.groupBy({
        by: ['gstRate'],
        _count: { id: true },
        where: { isActive: true },
        orderBy: { gstRate: 'asc' },
      }),
      prisma.hsnCode.groupBy({
        by: ['section'],
        _count: { id: true },
        where: { section: { not: null } },
        having: { id: { _count: { gt: 5 } } },
        orderBy: { _count: { id: 'desc' } },
        take: 15,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalCodes,
        activeCodes,
        inactiveCodes: totalCodes - activeCodes,
        chapterBreakdown,
        gstRateBreakdown,
        sectionBreakdown: sectionBreakdown.map(s => ({ section: s.section, count: s._count.id })),
      },
    });
  } catch (error) {
    console.error('HSN Stats Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}