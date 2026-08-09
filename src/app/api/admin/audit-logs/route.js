import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const admin = await prisma.adminProfile.findFirst({ where: { userId: user.id } });
    if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const action = searchParams.get('action');
    const entity = searchParams.get('entity');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where = {};
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const [logs, total, uniqueActions, uniqueEntities] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        select: { action: true },
        distinct: ['action'],
        orderBy: { action: 'asc' },
      }),
      prisma.auditLog.findMany({
        select: { entity: true },
        distinct: ['entity'],
        orderBy: { entity: 'asc' },
      }),
    ]);

    // Get unique userIds from logs and fetch user details separately
    const userIds = [...new Set(logs.map(log => log.userId).filter(Boolean))];
    const users = userIds.length > 0 ? await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, mobile: true },
    }) : [];
    
    const userMap = {};
    users.forEach(u => { userMap[u.id] = u; });

    // Attach user info to each log
    const logsWithUser = logs.map(log => ({
      ...log,
      user: log.userId ? (userMap[log.userId] || null) : null,
    }));

    return NextResponse.json({
      logs: logsWithUser,
      filters: {
        actions: uniqueActions.map(a => a.action).filter(Boolean),
        entities: uniqueEntities.map(e => e.entity).filter(Boolean),
      },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Audit logs error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}