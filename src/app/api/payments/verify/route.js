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

    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      return NextResponse.json({ error: 'Payment not captured' }, { status: 400 });
    }

    // Update order with payment details - keep as PENDING, supplier will accept
    if (orderId) {
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      
      if (order) {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentDetails: {
              method: payment.method,
              bank: payment.bank || null,
              wallet: payment.wallet || null,
              vpa: payment.vpa || null,
              cardId: payment.card_id || null,
              capturedAt: new Date().toISOString(),
            },
            razorpayPaymentId: razorpayPaymentId,
          },
        });

        // Create status history entry
        await prisma.orderStatusHistory.create({
          data: {
            orderId: orderId,
            fromStatus: order.status || 'PENDING',
            toStatus: order.status || 'PENDING',
            changedBy: user.id,
            notes: `Payment verified via ${payment.method?.toUpperCase() || 'Online'}. Payment ID: ${razorpayPaymentId}`,
          },
        });

        // Process commission
        CommissionService.processOrderCommission(orderId).catch((err) => {
          console.error('Commission processing error:', err.message);
        });
      }
    }

    // Record payment
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

    // Notifications
    try {
      const amount = payment.amount / 100;

      NotificationService.send({
        userId: user.id,
        type: 'IN_APP',
        title: '💳 Payment Successful',
        message: `Payment of ₹${amount.toLocaleString('en-IN')} received via ${payment.method?.toUpperCase() || 'Online'}. Waiting for supplier confirmation.`,
      }).catch(() => {});

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
            title: '💰 New Paid Order',
            message: `Payment received for order #${orderId.slice(0, 8)}. Accept the order now.`,
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
    console.error('Payment verify error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}