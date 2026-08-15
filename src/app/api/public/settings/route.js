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

    // Get NOTIFICATION settings
    const notificationSettings = await prisma.systemSetting.findMany({
      where: { category: 'NOTIFICATION' },
    });

    const notification = {};
    notificationSettings.forEach(s => {
      try { notification[s.key] = JSON.parse(s.value); } 
      catch { notification[s.key] = s.value; }
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
        deliveryVerification: {
          deliveryRadiusMeters: parseInt(delivery.deliveryRadiusMeters) || 50,
          waitTimerMinutes: parseInt(delivery.waitTimerMinutes) || 5,
          photoProofRequired: delivery.photoProofRequired !== 'false' && delivery.photoProofRequired !== false,
        },
        bankDetails: {
          bankName: bankDetails.bankName || '',
          accountHolder: bankDetails.accountHolder || '',
          accountNumber: bankDetails.accountNumber || '',
          ifscCode: bankDetails.ifscCode || '',
          branchName: bankDetails.branchName || '',
          upiId: bankDetails.upiId || '',
          notes: bankDetails.notes || '',
        },
        notificationSettings: {
          newOrderSound: notification.newOrderSound !== false && notification.newOrderSound !== 'false',
          soundVolume: parseInt(notification.soundVolume) || 50,
          soundFileUrl: notification.soundFileUrl || null,
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
        deliveryVerification: {
          deliveryRadiusMeters: 50,
          waitTimerMinutes: 5,
          photoProofRequired: true,
        },
        bankDetails: {
          bankName: '',
          accountHolder: '',
          accountNumber: '',
          ifscCode: '',
          branchName: '',
          upiId: '',
          notes: '',
        },
        notificationSettings: {
          newOrderSound: true,
          soundVolume: 50,
          soundFileUrl: null,
        },
      },
    });
  }
}