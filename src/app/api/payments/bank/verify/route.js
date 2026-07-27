import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { RazorpayService } from '@/services/razorpay.service';

export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, ifsc, accountNumber, accountHolder } = await request.json();

    if (action === 'verify_ifsc') {
      const result = await RazorpayService.validateIFSC(ifsc);
      return NextResponse.json(result);
    }

    if (action === 'verify_bank') {
      // Penny drop verification (requires active Razorpay payouts)
      const result = await RazorpayService.validateBankAccount({
        accountNumber,
        ifsc,
        accountHolder,
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}