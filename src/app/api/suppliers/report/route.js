import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { NotificationService } from '@/services/notification.service';

export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { supplierId, reason, notes } = body;

    if (!supplierId || !reason) {
      return NextResponse.json({ success: false, message: 'Supplier ID and reason are required' }, { status: 400 });
    }

    // Verify supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true, businessName: true },
    });

    if (!supplier) {
      return NextResponse.json({ success: false, message: 'Supplier not found' }, { status: 404 });
    }

    // Check if buyer already reported this supplier (avoid spam)
    const existingReport = await prisma.supplierReport.findFirst({
      where: {
        supplierId,
        buyerId: session.userId,
        status: 'PENDING',
      },
    });

    if (existingReport) {
      return NextResponse.json({ success: false, message: 'You already have a pending report for this supplier' }, { status: 409 });
    }

    // Create report
    const report = await prisma.supplierReport.create({
      data: {
        supplierId,
        buyerId: session.userId,
        reason,
        notes: notes || null,
        status: 'PENDING',
      },
    });

    // Notify admins
    try {
      const adminUsers = await prisma.user.findMany({
        where: {
          roles: {
            some: {
              role: {
                name: 'SUPER_ADMIN',
              },
            },
          },
        },
        select: { id: true },
      });

      for (const admin of adminUsers) {
        NotificationService.send({
          userId: admin.id,
          type: 'IN_APP',
          title: '🚨 New Supplier Report',
          message: `"${supplier.businessName}" was reported by a buyer. Reason: ${reason}`,
        }).catch(() => {});
      }
    } catch (notifErr) {
      console.error('Admin notification error:', notifErr.message);
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'SUPPLIER_REPORTED',
        entity: 'Supplier',
        entityId: supplierId,
        newValue: { reason, notes },
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, message: 'Report submitted successfully', data: report });
  } catch (error) {
    console.error('Supplier report error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to submit report' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');

    if (!supplierId) {
      return NextResponse.json({ success: false, message: 'Supplier ID is required' }, { status: 400 });
    }

    // Check if current user has already reported
    const existingReport = await prisma.supplierReport.findFirst({
      where: { supplierId, buyerId: session.userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, reason: true, status: true, createdAt: true },
    });

    return NextResponse.json({ success: true, data: existingReport });
  } catch (error) {
    console.error('Check report error:', error);
    return NextResponse.json({ success: false, message: 'Failed to check report' }, { status: 500 });
  }
}