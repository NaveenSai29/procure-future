import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { RazorpayService } from '@/services/razorpay.service';

export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { amount } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (amount < 100) {
      return NextResponse.json({ error: 'Minimum amount is ₹100' }, { status: 400 });
    }

    if (amount > 10000) {
      return NextResponse.json({ error: 'Maximum amount is ₹10,000' }, { status: 400 });
    }

    // Generate receipt
    const receipt = `wallet_${user.id.substring(0, 8)}_${Date.now().toString(36)}`.substring(0, 40);

    // Create Razorpay order
    const razorpayOrder = await RazorpayService.createOrder({
      amount,
      currency: 'INR',
      receipt,
      notes: {
        type: 'WALLET_TOPUP',
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('Wallet add money error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}