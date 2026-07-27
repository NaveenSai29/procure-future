import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - List all RFQs for admin
export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminProfile = await prisma.adminProfile.findFirst({
      where: { userId: user.id }
    });
    if (!adminProfile) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');

    const where = {};
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;

    const [rfqs, total, stats] = await Promise.all([
      prisma.rFQ.findMany({
        where,
        include: {
          buyer: { select: { id: true, name: true, email: true } },
          category: { select: { id: true, name: true } },
          _count: { select: { responses: true, quotations: true } },
          quotations: {
            select: { id: true, totalAmount: true, status: true, supplier: { select: { businessName: true } } }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.rFQ.count({ where }),
      prisma.rFQ.groupBy({
        by: ['status'],
        _count: true,
        _sum: { budgetMax: true }
      })
    ]);

    return NextResponse.json({
      rfqs,
      stats: {
        total: stats.reduce((s, r) => s + r._count, 0),
        draft: stats.find(s => s.status === 'DRAFT')?._count || 0,
        published: stats.find(s => s.status === 'PUBLISHED')?._count || 0,
        closed: stats.find(s => s.status === 'CLOSED')?._count || 0,
        awarded: stats.find(s => s.status === 'AWARDED')?._count || 0,
        cancelled: stats.find(s => s.status === 'CANCELLED')?._count || 0,
        totalBudget: stats.reduce((s, r) => s + (r._sum?.budgetMax || 0), 0)
      },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Admin RFQ list error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}