import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Public payment settings for buyer app checkout
export async function GET() {
  try {
    const dbSettings = await prisma.systemSetting.findMany({
      where: { category: 'PAYMENT' }
    });

    const settings = {};
    dbSettings.forEach(s => {
      try { settings[s.key] = JSON.parse(s.value); } 
      catch { settings[s.key] = s.value; }
    });

    return NextResponse.json({
      success: true,
      data: {
        cod: {
          enabled: settings.codEnabled !== false,
          maxAmount: settings.codMaxAmount || 50000,
        },
        wallet: {
          enabled: settings.walletEnabled !== false,
          minBalance: settings.walletMinBalance || 0,
        },
        online: {
          enabled: settings.razorpayEnabled === true,
        },
      },
    });
  } catch (error) {
    console.error('Payment settings error:', error);
    return NextResponse.json({ 
      success: true,
      data: {
        cod: { enabled: true, maxAmount: 50000 },
        wallet: { enabled: true, minBalance: 0 },
        online: { enabled: true },
      },
    });
  }
}