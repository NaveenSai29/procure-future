import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { clearFeatureCache } from '@/lib/features';

// GET - Get all platform settings
export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const admin = await prisma.adminProfile.findFirst({ where: { userId: user.id } });
    if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    // Get system settings from DB
    const dbSettings = await prisma.systemSetting.findMany();
    const settingsMap = {};
    dbSettings.forEach(s => {
      if (!settingsMap[s.category]) settingsMap[s.category] = {};
      try {
        settingsMap[s.category][s.key] = JSON.parse(s.value);
      } catch {
        settingsMap[s.category][s.key] = s.value;
      }
    });

    // Get platform stats
    const [
      userCount, supplierCount, productCount, orderCount,
      verifiedSuppliers, pendingProducts, activeRFQs, pendingReturns,
      totalRevenue, todayOrders
    ] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.supplier.count({ where: { isActive: true } }),
      prisma.product.count(),
      prisma.order.count(),
      prisma.supplier.count({ where: { isVerified: true } }),
      prisma.product.count({ where: { isApproved: false } }),
      prisma.rFQ.count({ where: { status: 'PUBLISHED' } }),
      prisma.returnRequest.count({ where: { status: 'PENDING' } }),
      prisma.order.aggregate({ where: { status: 'DELIVERED' }, _sum: { totalAmount: true } }),
      prisma.order.count({ where: { createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } } })
    ]);

    // Build features from settings
    const fSettings = settingsMap.FEATURES || {};
    const features = {
      marketplace: fSettings.marketplace !== false,
      payments: fSettings.payments !== false,
      delivery: fSettings.delivery !== false,
      rfq: fSettings.rfq === true,
      wallet: fSettings.wallet === true,
      referrals: fSettings.referrals === true,
      loyalty: fSettings.loyalty === true,
      ai: fSettings.ai === true,
      bulkImport: fSettings.bulkImport === true,
      sponsoredProducts: fSettings.sponsoredProducts === true,
      sms: fSettings.sms === true,
    };

    return NextResponse.json({
      platform: {
        name: settingsMap.GENERAL?.platformName || 'PROCURE',
        url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        version: '1.0.0',
        supportEmail: settingsMap.GENERAL?.supportEmail || 'support@procure.com',
        supportPhone: settingsMap.GENERAL?.supportPhone || '1800-PROCURE',
        language: settingsMap.GENERAL?.language || 'English',
        currency: settingsMap.GENERAL?.currency || 'INR',
        timezone: settingsMap.GENERAL?.timezone || 'Asia/Kolkata',
      },
      stats: {
        users: userCount, suppliers: supplierCount, products: productCount, orders: orderCount,
        verifiedSuppliers, pendingProducts, activeRFQs, pendingReturns,
        totalRevenue: totalRevenue._sum?.totalAmount || 0, todayOrders
      },
      settings: settingsMap,
      features,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Update settings
export async function PATCH(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const admin = await prisma.adminProfile.findFirst({ where: { userId: user.id } });
    if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const body = await request.json();
    const { category, settings } = body;

    if (!category || !settings) {
      return NextResponse.json({ error: 'Category and settings required' }, { status: 400 });
    }

    // Upsert each setting
    const operations = Object.entries(settings).map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { category_key: { category, key } },
        create: {
          category,
          key,
          value: typeof value === 'string' ? value : JSON.stringify(value),
          updatedBy: user.id
        },
        update: {
          value: typeof value === 'string' ? value : JSON.stringify(value),
          updatedBy: user.id
        }
      })
    );

    await prisma.$transaction(operations);

    // Clear feature cache if FEATURES category was updated
    if (category === 'FEATURES') {
      clearFeatureCache();
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE_SETTINGS',
        entity: 'SystemSetting',
        newValue: { category, keys: Object.keys(settings) },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      }
    });

    return NextResponse.json({ success: true, message: `${category} settings updated` });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}