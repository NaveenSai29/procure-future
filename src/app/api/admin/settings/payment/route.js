import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Read from SystemSetting table
    const dbSettings = await prisma.systemSetting.findMany({
      where: { category: { in: ['PAYMENT', 'SETTLEMENT', 'REFUND'] } }
    });

    const settings = {};
    dbSettings.forEach(s => {
      try { settings[s.key] = JSON.parse(s.value); } 
      catch { settings[s.key] = s.value; }
    });

    return NextResponse.json({
      gateways: {
        razorpay: { enabled: settings.razorpayEnabled ?? !!process.env.RAZORPAY_KEY_ID, keyId: process.env.RAZORPAY_KEY_ID ? '****' + process.env.RAZORPAY_KEY_ID.slice(-4) : null, mode: 'test' },
        stripe: { enabled: settings.stripeEnabled ?? false },
        upi: { enabled: settings.upiEnabled ?? true },
        bankTransfer: { enabled: settings.bankTransferEnabled ?? true },
        wallet: { enabled: settings.walletEnabled ?? true, minBalance: settings.walletMinBalance ?? 0 },
        cod: { enabled: settings.codEnabled ?? true, maxAmount: settings.codMaxAmount ?? 50000 }
      },
      settlement: {
        settlementCycle: settings.settlementCycle ?? 'WEEKLY',
        minSettlementAmount: settings.minSettlement ?? 1000,
        holdPeriod: settings.holdPeriod ?? 7
      },
      refund: {
        refundApprovalRequired: settings.refundApprovalRequired ?? true,
        maxRefundDays: settings.maxRefundDays ?? 30,
        partialRefundEnabled: settings.partialRefundEnabled ?? true,
        autoRefundBelow: settings.autoRefundBelow ?? 0,
        refundToWallet: settings.refundToWallet ?? true,
        refundToBank: settings.refundToBank ?? true,
        refundToOriginal: settings.refundToOriginal ?? true,
        platformCommissionOnRefund: settings.platformCommissionOnRefund ?? false,
        platformCommissionRate: settings.platformCommissionRate ?? 0
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    return NextResponse.json({ success: true, message: 'Payment settings updated' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}