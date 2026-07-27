// src/app/api/admin/hsn/route.js

import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - List HSN codes with search, pagination, filters
export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const admin = await prisma.adminProfile.findFirst({ where: { userId: user.id } });
    if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const chapter = searchParams.get('chapter') || '';
    const section = searchParams.get('section') || '';
    const gstRate = searchParams.get('gstRate') || '';
    const isActive = searchParams.get('isActive');
    const sortBy = searchParams.get('sortBy') || 'code';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {};
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { description: { contains: search } },
        { chapter: { contains: search } },
        { section: { contains: search } },
      ];
    }
    if (chapter) where.chapter = chapter;
    if (section) where.section = section;
    if (gstRate) where.gstRate = parseFloat(gstRate);
    if (isActive !== null && isActive !== '') where.isActive = isActive === 'true';

    // Get total count
    const total = await prisma.hsnCode.count({ where });

    // Get HSN codes
    const hsnCodes = await prisma.hsnCode.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    // Get unique chapters and sections for filters
    const [chapters, sections, gstRates] = await Promise.all([
      prisma.hsnCode.findMany({
        select: { chapter: true },
        distinct: ['chapter'],
        orderBy: { chapter: 'asc' },
      }),
      prisma.hsnCode.findMany({
        select: { section: true },
        distinct: ['section'],
        where: { section: { not: null } },
        orderBy: { section: 'asc' },
      }),
      prisma.hsnCode.findMany({
        select: { gstRate: true },
        distinct: ['gstRate'],
        orderBy: { gstRate: 'asc' },
      }),
    ]);

    // Stats
    const [totalActive, totalInactive, distinctChapters] = await Promise.all([
      prisma.hsnCode.count({ where: { isActive: true } }),
      prisma.hsnCode.count({ where: { isActive: false } }),
      prisma.hsnCode.groupBy({ by: ['chapter'], _count: true }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        hsnCodes,
        filters: {
          chapters: chapters.map(c => c.chapter),
          sections: sections.map(s => s.section).filter(Boolean),
          gstRates: gstRates.map(r => r.gstRate),
        },
        stats: {
          total,
          totalActive,
          totalInactive,
          distinctChapters: distinctChapters.length,
        },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: skip + limit < total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error('HSN List Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new HSN code or bulk import
export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const admin = await prisma.adminProfile.findFirst({ where: { userId: user.id } });
    if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const body = await request.json();
    const { action, data } = body;

    if (action === 'BULK_IMPORT' && Array.isArray(data)) {
      let created = 0;
      let updated = 0;
      let skipped = 0;
      const errors = [];

      for (const item of data) {
        try {
          if (!item.code || !item.description) {
            errors.push({ code: item.code || 'N/A', error: 'Code and description required' });
            skipped++;
            continue;
          }

          const exists = await prisma.hsnCode.findUnique({ where: { code: item.code } });
          
          if (exists) {
            await prisma.hsnCode.update({
              where: { code: item.code },
              data: {
                description: item.description || exists.description,
                chapter: item.chapter || exists.chapter,
                section: item.section || exists.section,
                gstRate: item.gstRate !== undefined ? parseFloat(item.gstRate) : exists.gstRate,
                cess: item.cess !== undefined ? parseFloat(item.cess) : exists.cess,
                isActive: item.isActive !== undefined ? item.isActive : exists.isActive,
              },
            });
            updated++;
          } else {
            await prisma.hsnCode.create({
              data: {
                code: item.code,
                description: item.description,
                chapter: item.chapter || item.code.substring(0, 2),
                section: item.section || null,
                gstRate: parseFloat(item.gstRate) || 18,
                cess: parseFloat(item.cess) || 0,
                isActive: item.isActive !== undefined ? item.isActive : true,
              },
            });
            created++;
          }
        } catch (err) {
          errors.push({ code: item.code, error: err.message });
          skipped++;
        }
      }

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'HSN_BULK_IMPORT',
          entity: 'HsnCode',
          newValue: { created, updated, skipped, totalErrors: errors.length },
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        },
      });

      return NextResponse.json({
        success: true,
        message: `Import complete: ${created} created, ${updated} updated, ${skipped} skipped`,
        data: { created, updated, skipped, errors: errors.slice(0, 10) },
      });
    }

    // Single create
    if (!body.code || !body.description) {
      return NextResponse.json({ error: 'Code and description required' }, { status: 400 });
    }

    const existing = await prisma.hsnCode.findUnique({ where: { code: body.code } });
    if (existing) {
      return NextResponse.json({ error: 'HSN code already exists' }, { status: 409 });
    }

    const hsnCode = await prisma.hsnCode.create({
      data: {
        code: body.code,
        description: body.description,
        chapter: body.chapter || body.code.substring(0, 2),
        section: body.section || null,
        gstRate: parseFloat(body.gstRate) || 18,
        cess: parseFloat(body.cess) || 0,
        isActive: body.isActive !== undefined ? body.isActive : true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'HSN_CREATE',
        entity: 'HsnCode',
        entityId: hsnCode.id,
        newValue: { code: hsnCode.code, description: hsnCode.description },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      },
    });

    return NextResponse.json({ success: true, data: hsnCode, message: 'HSN code created' }, { status: 201 });
  } catch (error) {
    console.error('HSN Create Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}