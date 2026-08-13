import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { RazorpayService } from '@/services/razorpay.service';
import { NotificationService } from '@/services/notification.service';

export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, amount } = await request.json();

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json({ error: 'Missing payment details' }, { status: 400 });
    }

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

    const creditAmount = amount || (payment.amount / 100);

    // Check for duplicate wallet credit
    const existingCredit = await prisma.buyerWalletTransaction.findFirst({
      where: {
        referenceType: 'SELF_ADDED',
        referenceId: razorpayPaymentId,
      },
    });

    if (existingCredit) {
      return NextResponse.json({
        success: true,
        message: 'Wallet already credited',
        balance: existingCredit.balanceAfter,
      });
    }

    // Get or create wallet
    let wallet = await prisma.buyerWallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet) {
      wallet = await prisma.buyerWallet.create({
        data: { userId: user.id, balance: 0 },
      });
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + creditAmount;

    // Create wallet transaction
    await prisma.buyerWalletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'CREDIT',
        amount: creditAmount,
        referenceType: 'SELF_ADDED',
        referenceId: razorpayPaymentId,
        description: `Added to wallet via ${payment.method?.toUpperCase() || 'Online'}`,
        balanceBefore,
        balanceAfter,
      },
    });

    // Update wallet balance
    await prisma.buyerWallet.update({
      where: { id: wallet.id },
      data: { balance: balanceAfter },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'WALLET_TOPUP',
        entity: 'BuyerWallet',
        entityId: wallet.id,
        newValue: { amount: creditAmount, razorpayPaymentId, method: payment.method },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      },
    });

    // Send notification
    NotificationService.send({
      userId: user.id,
      type: 'IN_APP',
      title: '💰 Wallet Credited!',
      message: `₹${creditAmount.toLocaleString('en-IN')} added to your wallet via ${payment.method?.toUpperCase() || 'Online'}.`,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Wallet credited successfully',
      balance: balanceAfter,
      amount: creditAmount,
    });
  } catch (error) {
    console.error('Wallet verify error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}