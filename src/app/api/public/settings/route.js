import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const dbSettings = await prisma.systemSetting.findMany({
      where: { category: 'GENERAL' },
    });

    const settings = {};
    dbSettings.forEach(s => {
      try {
        settings[s.key] = JSON.parse(s.value);
      } catch {
        settings[s.key] = s.value;
      }
    });

    return NextResponse.json({
      platform: {
        name: settings.platformName || 'PROCURE',
        description: settings.platformDescription || 'Enterprise procurement platform for modern businesses.',
        supportEmail: settings.supportEmail || 'support@procure.com',
        supportPhone: settings.supportPhone || '1800-PROCURE',
        url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        language: settings.language || 'English',
        currency: settings.currency || 'INR',
        timezone: settings.timezone || 'Asia/Kolkata',
      },
    });
  } catch (error) {
    return NextResponse.json({
      platform: {
        name: 'PROCURE',
        description: 'Enterprise procurement platform for modern businesses.',
        supportEmail: 'support@procure.com',
        supportPhone: '1800-PROCURE',
      },
    });
  }
}