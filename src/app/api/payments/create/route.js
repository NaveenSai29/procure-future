import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { RazorpayService } from '@/services/razorpay.service';

export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { orderId, amount, currency = 'INR' } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Create Razorpay order
    const razorpayOrder = await RazorpayService.createOrder({
      amount,
      currency,
      receipt: `order_${orderId || Date.now()}`,
      notes: {
        orderId: orderId || 'direct_payment',
        userId: user.id,
      },
    });

    return NextResponse.json({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}