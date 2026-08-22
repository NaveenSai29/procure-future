import prisma from '@/lib/prisma';
import { getSessionUser, successResponse, errorResponse } from '@/lib/auth';
import { RazorpayService } from '@/services/razorpay.service';

export async function POST(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse('Unauthorized', 401);

    const { id } = await params;
    const { amount, action, razorpayOrderId, razorpayPaymentId, razorpaySignature } = await request.json();

    if (!amount || amount < 1 || amount > 500) {
      return errorResponse('Tip amount must be between ₹1 and ₹500', 400);
    }

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        buyerId: true,
        status: true,
        tipAmount: true,
        delivery: { 
          select: { 
            partnerId: true,
            partner: {
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!order) return errorResponse('Order not found', 404);
    if (order.buyerId !== session.userId) return errorResponse('You can only tip your own orders', 403);
    if (order.status !== 'DELIVERED') return errorResponse('Can only tip delivered orders', 400);

    const partnerId = order.delivery?.partnerId;
    if (!partnerId) return errorResponse('No delivery partner found', 404);

    // Step 1: Create Razorpay order
    if (action === 'create') {
      if (order.tipAmount > 0) return errorResponse('Tip already given for this order', 400);
      
      const razorpayOrder = await RazorpayService.createOrder({
        amount: amount * 100,
        currency: 'INR',
        receipt: `tip_${order.id.slice(0, 8)}`,
        notes: { type: 'TIP', orderId: order.id, partnerId },
      });

      return successResponse({ 
        razorpayOrderId: razorpayOrder.id,
        keyId: process.env.RAZORPAY_KEY_ID,
        amount: amount * 100,
      });
    }

    // Step 2: Verify payment
    if (action === 'verify') {
      if (order.tipAmount > 0) return errorResponse('Tip already given for this order', 400);
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return errorResponse('Missing payment details', 400);
      }

      const isValid = RazorpayService.verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
      if (!isValid) return errorResponse('Invalid payment signature', 400);

      // Update order tip amount
      await prisma.order.update({
        where: { id },
        data: { tipAmount: amount },
      });

      // Credit partner wallet
      let wallet = await prisma.partnerWallet.findUnique({ where: { partnerId } });
      if (!wallet) {
        wallet = await prisma.partnerWallet.create({ data: { partnerId, balance: 0, totalEarned: 0 } });
      }

      await prisma.partnerWallet.update({
        where: { id: wallet.id },
        data: {
          balance: wallet.balance + amount,
          totalEarned: wallet.totalEarned + amount,
        },
      });

      // Create tip transaction record
      await prisma.partnerTip.create({
        data: {
          orderId: order.id,
          partnerId,
          buyerId: session.userId,
          amount,
          razorpayOrderId,
          razorpayPaymentId,
          status: 'COMPLETED',
        },
      });

      // Send notification to partner
      try {
        const { NotificationService } = await import('@/services/notification.service');
        NotificationService.send({
          userId: order.delivery.partner.userId,
          type: 'IN_APP',
          title: '💰 Tip Received!',
          message: `You received ₹${amount} tip! 100% goes to you.`,
        }).catch(() => {});
      } catch (notifErr) {
        console.error('Tip notification error:', notifErr.message);
      }

      return successResponse({ message: 'Tip sent successfully', tipAmount: amount });
    }

    return errorResponse('Invalid action', 400);
  } catch (error) {
    console.error('Tip error:', error);
    return errorResponse('Failed to process tip', 500);
  }
}