import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getShopStatus(settings, isActive) {
  if (!isActive) return { isOpen: false, reason: 'offline', nextOpenTime: null, nextOpenDay: null, closesIn: null };
  if (!settings || !settings.shopOpenTime || !settings.shopCloseTime || !settings.shopOpenDays) {
    return { isOpen: false, reason: 'not_set', nextOpenTime: null, nextOpenDay: null, closesIn: null };
  }

  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const dayMap = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const currentDay = dayMap[now.getDay()];
  
  let openDays = [];
  try {
    openDays = JSON.parse(settings.shopOpenDays || '[]');
  } catch {
    try {
      openDays = settings.shopOpenDays.split(',').map(d => d.trim());
    } catch { openDays = []; }
  }

  if (!openDays.includes(currentDay)) {
    // Find next open day
    let nextDay = null;
    let nextDayIndex = null;
    for (let i = 1; i <= 7; i++) {
      const checkIndex = (now.getDay() + i) % 7;
      const checkDay = dayMap[checkIndex];
      if (openDays.includes(checkDay)) {
        nextDay = checkDay;
        nextDayIndex = i;
        break;
      }
    }
    return { isOpen: false, reason: 'day_off', nextOpenTime: settings.shopOpenTime, nextOpenDay: nextDay, closesIn: null };
  }

  const [openH, openM] = settings.shopOpenTime.split(':').map(Number);
  const [closeH, closeM] = settings.shopCloseTime.split(':').map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Handle overnight (close time before open time = closes next day)
  const isOvernight = closeMinutes < openMinutes;
  const effectiveCloseMinutes = isOvernight ? closeMinutes + 24 * 60 : closeMinutes;
  const effectiveCurrentMinutes = isOvernight && currentMinutes < openMinutes ? currentMinutes + 24 * 60 : currentMinutes;

  if (effectiveCurrentMinutes < openMinutes) {
    return { isOpen: false, reason: 'not_open_yet', nextOpenTime: settings.shopOpenTime, nextOpenDay: currentDay, closesIn: null };
  }
  if (effectiveCurrentMinutes >= effectiveCloseMinutes) {
    let nextDay = null;
    for (let i = 1; i <= 7; i++) {
      const checkIndex = (now.getDay() + i) % 7;
      const checkDay = dayMap[checkIndex];
      if (openDays.includes(checkDay)) {
        nextDay = checkDay;
        break;
      }
    }
    return { isOpen: false, reason: 'closed', nextOpenTime: settings.shopOpenTime, nextOpenDay: nextDay, closesIn: null };
  }

  const closesIn = effectiveCloseMinutes - effectiveCurrentMinutes;
  return { isOpen: true, reason: null, nextOpenTime: null, nextOpenDay: null, closesIn };
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const buyerLat = parseFloat(searchParams.get('buyerLat'));
    const buyerLng = parseFloat(searchParams.get('buyerLng'));

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      select: {
        id: true,
        businessName: true,
        businessType: true,
        tags: true,
        coverVideo: true,
        gstin: true,
        gstBusinessName: true,
        isVerified: true,
        gstVerified: true,
        isActive: true,
        mobile: true,
        email: true,
        website: true,
        avgRating: true,
        ratingCount: true,
        createdAt: true,
        codEnabled: true,
        settings: {
          select: {
            shopOpenTime: true,
            shopCloseTime: true,
            shopOpenDays: true,
          },
        },
        photos: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, url: true },
        },
        warehouses: {
          where: { isActive: true, isPickupLocation: true, latitude: { not: null } },
          take: 1,
          select: {
            latitude: true,
            longitude: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            area: true,
            state: true,
            pincode: true,
          },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json({ success: false, message: 'Supplier not found' }, { status: 404 });
    }

    let parsedTags = [];
    try {
      parsedTags = supplier.tags ? JSON.parse(supplier.tags) : [];
    } catch { parsedTags = []; }

    const productsCount = await prisma.product.count({
      where: { supplierId: id, isApproved: true, isActive: true },
    });

    const shopStatus = getShopStatus(supplier.settings, supplier.isActive);
    const warehouse = supplier.warehouses?.[0];

    let distance = null;
    if (buyerLat && buyerLng && warehouse?.latitude && warehouse?.longitude) {
      distance = haversineDistance(buyerLat, buyerLng, warehouse.latitude, warehouse.longitude);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...supplier,
        tags: parsedTags,
        shopStatus,
        distance,
        productsCount,
      },
    });
  } catch (error) {
    console.error('Supplier detail error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch supplier' }, { status: 500 });
  }
}