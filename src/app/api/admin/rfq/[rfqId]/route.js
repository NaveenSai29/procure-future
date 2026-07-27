import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Single RFQ with full details
export async function GET(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminProfile = await prisma.adminProfile.findFirst({
      where: { userId: user.id }
    });
    if (!adminProfile) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const { rfqId } = await params;
    const rfq = await prisma.rFQ.findUnique({
      where: { id: rfqId },
      include: {
        buyer: { select: { id: true, name: true, email: true, mobile: true } },
        category: true,
        items: true,
        attachments: true,
        responses: {
          include: {
            supplier: { select: { id: true, businessName: true, email: true, mobile: true, isVerified: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        quotations: {
          include: {
            supplier: { select: { id: true, businessName: true, email: true } },
            items: true
          },
          orderBy: { totalAmount: 'asc' }
        }
      }
    });

    if (!rfq) return NextResponse.json({ error: 'RFQ not found' }, { status: 404 });

    // Get comparison data
    const comparison = rfq.quotations.map(q => ({
      supplierId: q.supplierId,
      supplierName: q.supplier.businessName,
      totalAmount: q.totalAmount,
      taxAmount: q.taxAmount,
      deliveryDays: q.deliveryDays,
      validityDays: q.validityDays,
      status: q.status,
      itemsCount: q.items.length
    }));

    return NextResponse.json({ ...rfq, comparison });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Update RFQ status (admin actions)
export async function PATCH(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminProfile = await prisma.adminProfile.findFirst({
      where: { userId: user.id }
    });
    if (!adminProfile) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const { rfqId } = await params;
    const body = await request.json();
    const { status, awardedSupplierId, notes } = body;

    const updateData = {};
    if (status) updateData.status = status;

    // Handle award
    if (status === 'AWARDED' && awardedSupplierId) {
      // Update the awarded quotation
      await prisma.quotation.updateMany({
        where: { rfqId, supplierId: awardedSupplierId },
        data: { status: 'ACCEPTED' }
      });

      // Reject other quotations
      await prisma.quotation.updateMany({
        where: { rfqId, supplierId: { not: awardedSupplierId } },
        data: { status: 'REJECTED' }
      });
    }

    const rfq = await prisma.rFQ.update({
      where: { id: rfqId },
      data: updateData,
      include: {
        buyer: { select: { name: true } },
        quotations: {
          include: { supplier: { select: { businessName: true } } }
        }
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE_RFQ_STATUS',
        entity: 'RFQ',
        entityId: rfqId,
        newValue: { status, awardedSupplierId },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      }
    });

    return NextResponse.json(rfq);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}