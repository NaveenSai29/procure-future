import prisma from '@/lib/prisma';
import { getSessionUser, successResponse, errorResponse } from '@/lib/auth';
import { RazorpayService } from '@/services/razorpay.service';

/**
 * POST - Create a Razorpay order for COD UPI QR payment
 */
export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) {
      return errorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const { deliveryId, orderId } = body;

    if (!deliveryId && !orderId) {
      return errorResponse('deliveryId or orderId required', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { deliveryPartner: { select: { id: true } } },
    });

    if (!user?.deliveryPartner) {
      return errorResponse('Delivery partner profile not found', 404);
    }

    const delivery = await prisma.delivery.findFirst({
      where: {
        id: deliveryId || undefined,
        partnerId: user.deliveryPartner.id,
      },
      include: {
        order: {
          select: {
            id: true,
            totalAmount: true,
            paymentMethod: true,
          },
        },
      },
    });

    if (!delivery) {
      return errorResponse('Delivery not found', 404);
    }

    if (delivery.order.paymentMethod !== 'COD') {
      return errorResponse('This is not a COD order', 400);
    }

    const orderTotalAmount = delivery.order.totalAmount || 0;

    const razorpayOrder = await RazorpayService.createOrder({
      amount: orderTotalAmount,
      currency: 'INR',
      receipt: `cod_${delivery.id.slice(0, 12)}`,
      notes: {
        deliveryId: delivery.id,
        orderId: delivery.order.id,
        type: 'COD_UPI',
      },
    });

    return successResponse({
      razorpayOrderId: razorpayOrder.id,
      amount: orderTotalAmount,
      currency: 'INR',
      upiId: process.env.RAZORPAY_UPI_ID || 'procure.payments@hdfcbank',
      qrData: `upi://pay?pa=${process.env.RAZORPAY_UPI_ID || 'procure.payments@hdfcbank'}&pn=PROCURE&am=${orderTotalAmount}&tr=ORDER${delivery.order.id.slice(0, 10)}&tn=COD%20Payment`,
    });
  } catch (error) {
    console.error('COD UPI QR error:', error);
    return errorResponse('Failed to create UPI QR', 500);
  }
}

/**
 * GET - Check payment status for COD UPI (polled every 3 seconds)
 */
export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) {
      return errorResponse('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const deliveryId = searchParams.get('deliveryId');
    const razorpayOrderId = searchParams.get('razorpayOrderId');

    if (!deliveryId || !razorpayOrderId) {
      return errorResponse('deliveryId and razorpayOrderId required', 400);
    }

    const payments = await RazorpayService.getPayments();
    
    const matchingPayment = payments.items?.find(p => 
      p.order_id === razorpayOrderId && 
      (p.status === 'captured' || p.status === 'authorized')
    );

    if (matchingPayment) {
      return successResponse({
        paid: true,
        paymentId: matchingPayment.id,
        amount: matchingPayment.amount / 100,
        method: matchingPayment.method,
        vpa: matchingPayment.vpa || null,
      });
    }

    return successResponse({
      paid: false,
      message: 'Waiting for payment...',
    });
  } catch (error) {
    console.error('COD UPI status check error:', error);
    return errorResponse('Failed to check payment status', 500);
  }
}