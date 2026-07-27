import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { RazorpayService } from '@/services/razorpay.service';
import { CommissionService } from '@/services/commission.service';
import { NotificationService } from '@/services/notification.service';

export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = await request.json();

    // Verify signature
    const isValid = RazorpayService.verifyPaymentSignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!isValid) {
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
    }

    // Get payment details from Razorpay
    const payment = await RazorpayService.getPayment(razorpayPaymentId);

    if (payment.status !== 'captured') {
      return NextResponse.json({ error: 'Payment not captured' }, { status: 400 });
    }

    // Update order status if orderId provided
    if (orderId) {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'CONFIRMED',
          statusHistory: {
            create: {
              fromStatus: 'PENDING',
              toStatus: 'CONFIRMED',
              changedBy: user.id,
            },
          },
        },
      });

      // Process commission
      await CommissionService.processOrderCommission(orderId);
    }

    // Record payment in database
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PAYMENT_RECEIVED',
        entity: 'Payment',
        entityId: razorpayPaymentId,
        newValue: { amount: payment.amount / 100, method: payment.method, orderId },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      },
    });

    // ─── SEND PAYMENT NOTIFICATIONS ───
    try {
      const amount = payment.amount / 100;

      // Notify buyer
      NotificationService.send({
        userId: user.id,
        type: 'IN_APP',
        title: '💳 Payment Successful',
        message: `Payment of ₹${amount.toLocaleString('en-IN')} received. Your order is now confirmed.`,
      }).catch(() => {});

      // Notify supplier if order exists
      if (orderId) {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: {
            product: {
              include: {
                supplier: {
                  include: {
                    staff: { take: 1, select: { userId: true } },
                  },
                },
              },
            },
          },
        });

        if (order?.product?.supplier?.staff[0]?.userId) {
          NotificationService.send({
            userId: order.product.supplier.staff[0].userId,
            type: 'IN_APP',
            title: '💰 Payment Received',
            message: `Payment of ₹${amount.toLocaleString('en-IN')} received for order #${orderId.slice(0,8)}. Process the order now.`,
          }).catch(() => {});
        }
      }
    } catch (notifErr) {
      console.error('Payment notification error:', notifErr.message);
    }

    return NextResponse.json({
      success: true,
      paymentId: razorpayPaymentId,
      amount: payment.amount / 100,
      method: payment.method,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}