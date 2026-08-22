import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const userRoles = await prisma.userRole.findMany({
      where: { userId: session.userId },
      include: { role: true },
    });

    const isAdmin = userRoles.some(ur => ['SUPER_ADMIN', 'ADMIN'].includes(ur.role.name));
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const [reports, total] = await Promise.all([
      prisma.supplierReport.findMany({
        where,
        include: {
          supplier: {
            select: { id: true, businessName: true, mobile: true, gstin: true },
          },
          buyer: {
            select: { id: true, name: true, mobile: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.supplierReport.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        reports,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error('Admin supplier reports error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch reports' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userRoles = await prisma.userRole.findMany({
      where: { userId: session.userId },
      include: { role: true },
    });

    const isAdmin = userRoles.some(ur => ['SUPER_ADMIN', 'ADMIN'].includes(ur.role.name));
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { reportId, status } = body;

    if (!reportId || !status) {
      return NextResponse.json({ success: false, message: 'Report ID and status are required' }, { status: 400 });
    }

    const allowedStatuses = ['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ success: false, message: 'Invalid status' }, { status: 400 });
    }

    const updated = await prisma.supplierReport.update({
      where: { id: reportId },
      data: {
        status,
        reviewedBy: session.userId,
        reviewedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, message: `Report ${status.toLowerCase()}`, data: updated });
  } catch (error) {
    console.error('Update report error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update report' }, { status: 500 });
  }
}