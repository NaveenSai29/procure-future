import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get GENERAL settings
    const generalSettings = await prisma.systemSetting.findMany({
      where: { category: 'GENERAL' },
    });

    const general = {};
    generalSettings.forEach(s => {
      try { general[s.key] = JSON.parse(s.value); } 
      catch { general[s.key] = s.value; }
    });

    // Get DELIVERY settings
    const deliverySettings = await prisma.systemSetting.findMany({
      where: { category: 'DELIVERY' },
    });

    const delivery = {};
    deliverySettings.forEach(s => {
      try { delivery[s.key] = JSON.parse(s.value); } 
      catch { delivery[s.key] = s.value; }
    });

    // Get BANK_DETAILS settings
    const bankSettings = await prisma.systemSetting.findMany({
      where: { category: 'BANK_DETAILS' },
    });

    const bankDetails = {};
    bankSettings.forEach(s => {
      try { bankDetails[s.key] = JSON.parse(s.value); } 
      catch { bankDetails[s.key] = s.value; }
    });

    // Parse vehicles from delivery settings
    let vehicles = [];
    try {
      vehicles = delivery.vehicles || [];
    } catch { vehicles = []; }

    return NextResponse.json({
      success: true,
      data: {
        platform: {
          name: general.platformName || 'PROCURE',
          description: general.platformDescription || 'Enterprise procurement platform for modern businesses.',
          supportEmail: general.supportEmail || 'support@procure.com',
          supportPhone: general.supportPhone || '1800-PROCURE',
          url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          language: general.language || 'English',
          currency: general.currency || 'INR',
          timezone: general.timezone || 'Asia/Kolkata',
        },
        freeDeliveryAbove: parseFloat(delivery.freeDeliveryAbove) || 999,
        riderIconUrl: delivery.riderIconUrl || null,
        vehicles: vehicles,
        bankDetails: {
          bankName: bankDetails.bankName || '',
          accountHolder: bankDetails.accountHolder || '',
          accountNumber: bankDetails.accountNumber || '',
          ifscCode: bankDetails.ifscCode || '',
          branchName: bankDetails.branchName || '',
          upiId: bankDetails.upiId || '',
          notes: bankDetails.notes || '',
        },
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: true,
      data: {
        platform: {
          name: 'PROCURE',
          description: 'Enterprise procurement platform for modern businesses.',
          supportEmail: 'support@procure.com',
          supportPhone: '1800-PROCURE',
        },
        freeDeliveryAbove: 999,
        riderIconUrl: null,
        vehicles: [],
        bankDetails: {
          bankName: '',
          accountHolder: '',
          accountNumber: '',
          ifscCode: '',
          branchName: '',
          upiId: '',
          notes: '',
        },
      },
    });
  }
}