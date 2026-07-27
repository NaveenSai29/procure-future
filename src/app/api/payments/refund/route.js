import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { RazorpayService } from '@/services/razorpay.service';

export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { paymentId, amount, returnRequestId } = await request.json();

    // Process refund via Razorpay
    const refund = await RazorpayService.createRefund({
      paymentId,
      amount, // Optional - full refund if not provided
    });

    // Update return request if provided
    if (returnRequestId) {
      await prisma.returnRequest.update({
        where: { id: returnRequestId },
        data: {
          refundStatus: 'PROCESSED',
          completedAt: new Date(),
        },
      });
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'REFUND_PROCESSED',
        entity: 'Payment',
        entityId: paymentId,
        newValue: { refundId: refund.id, amount: refund.amount / 100 },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      },
    });

    return NextResponse.json({
      success: true,
      refundId: refund.id,
      amount: refund.amount / 100,
      status: refund.status,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}