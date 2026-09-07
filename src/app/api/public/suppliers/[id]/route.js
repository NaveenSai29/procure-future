import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getShopStatus } from '@/lib/shopStatus';

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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