import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Helper to calculate distance between two coordinates
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Helper to check if shop is currently open
function getShopStatus(settings, isActive) {
  if (!isActive) return { isOpen: false, reason: 'offline', nextOpenTime: null, closesIn: null };
  if (!settings?.shopOpenTime || !settings?.shopCloseTime) return { isOpen: false, reason: 'not_set', nextOpenTime: null, closesIn: null };

  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const today = days[now.getDay()];
  
  let openDays = [];
  try {
    openDays = settings.shopOpenDays ? JSON.parse(settings.shopOpenDays) : days;
  } catch { openDays = days; }

  const [openH, openM] = settings.shopOpenTime.split(':').map(Number);
  const [closeH, closeM] = settings.shopCloseTime.split(':').map(Number);
  
  const todayOpen = new Date(now);
  todayOpen.setHours(openH, openM, 0, 0);
  
  const todayClose = new Date(now);
  todayClose.setHours(closeH, closeM, 0, 0);

  // If today is not an open day
  if (!openDays.includes(today)) {
    return { isOpen: false, reason: 'day_off', nextOpenTime: `${String(openH).padStart(2, '0')}:${String(openM).padStart(2, '0')}`, nextOpenDay: 'Tomorrow', closesIn: null };
  }

  // Check if within open hours
  if (now >= todayOpen && now < todayClose) {
    const closesInMs = todayClose.getTime() - now.getTime();
    const closesInMin = Math.floor(closesInMs / 60000);
    return { isOpen: true, reason: null, nextOpenTime: null, closesIn: closesInMin };
  }

  // Shop is closed for today - find next open time
  if (now >= todayClose) {
    return { isOpen: false, reason: 'closed', nextOpenTime: `${String(openH).padStart(2, '0')}:${String(openM).padStart(2, '0')}`, nextOpenDay: 'Tomorrow', closesIn: null };
  }

  // Before opening time today
  return { isOpen: false, reason: 'not_open_yet', nextOpenTime: `${String(openH).padStart(2, '0')}:${String(openM).padStart(2, '0')}`, nextOpenDay: 'Today', closesIn: null };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get("supplierId");
    const buyerLat = parseFloat(searchParams.get("buyerLat"));
    const buyerLng = parseFloat(searchParams.get("buyerLng"));

    // Get max distance setting
    const distanceSetting = await prisma.systemSetting.findFirst({
      where: { category: 'DELIVERY', key: 'maxDistance' },
    });
    const maxDistance = distanceSetting ? parseFloat(distanceSetting.value) : 200;

    if (supplierId) {
      const supplier = await prisma.supplier.findUnique({
        where: { id: supplierId, isVerified: true, gstVerified: true, isActive: true },
        select: {
          id: true,
          businessName: true,
          businessType: true,
          logo: true,
          banner: true,
          email: true,
          mobile: true,
          gstin: true,
          gstVerified: true,
          gstBusinessName: true,
          isVerified: true,
          isActive: true,
          createdAt: true,
          tags: true,
          coverVideo: true,
          settings: {
            select: {
              shopOpenTime: true,
              shopCloseTime: true,
              shopOpenDays: true,
            },
          },
          branches: {
            where: { isHeadOffice: true },
            take: 1,
            select: {
              addressLine1: true,
              addressLine2: true,
              city: true,
              state: true,
              pincode: true,
              mobile: true,
              email: true,
            },
          },
          photos: {
            orderBy: { sortOrder: 'asc' },
            take: 5,
            select: { id: true, url: true },
          },
          productImages: {
            where: {
              isApproved: true,
              isActive: true,
              images: { some: {} },
            },
            take: 9,
            select: {
              id: true,
              name: true,
              images: {
                take: 1,
                orderBy: { sortOrder: 'asc' },
                select: { url: true },
              },
            },
          },
          warehouses: {
            where: { isActive: true, isPickupLocation: true },
            select: {
              id: true,
              name: true,
              city: true,
              state: true,
              latitude: true,
              longitude: true,
              isPickupLocation: true,
              addressLine1: true,
              addressLine2: true,
              pincode: true,
            },
          },
          products: {
            where: { isApproved: true, isActive: true },
            select: {
              category: {
                select: { id: true, name: true },
              },
            },
            distinct: ['categoryId'],
            take: 10,
          },
          _count: { select: { products: true } },
        },
      });

      if (!supplier) {
        return NextResponse.json({ success: false, message: "Supplier not found" }, { status: 404 });
      }

      const categories = [...new Map(
        supplier.products
          .filter(p => p.category)
          .map(p => [p.category.id, p.category])
      ).values()];

      const { products, settings, ...supplierData } = supplier;
      const shopStatus = getShopStatus(settings, supplier.isActive);
      
      let parsedTags = [];
      try {
        parsedTags = supplier.tags ? JSON.parse(supplier.tags) : [];
      } catch { parsedTags = []; }

      return NextResponse.json({
        success: true,
        data: {
          ...supplierData,
          tags: parsedTags,
          categories,
          shopStatus,
          shopHours: settings ? {
            openTime: settings.shopOpenTime,
            closeTime: settings.shopCloseTime,
            openDays: settings.shopOpenDays ? JSON.parse(settings.shopOpenDays) : null,
          } : null,
        },
      });
    }

    // List all verified suppliers
    const suppliers = await prisma.supplier.findMany({
      where: { isVerified: true, gstVerified: true, isActive: true },
      select: {
        id: true,
        businessName: true,
        businessType: true,
        logo: true,
        banner: true,
        gstVerified: true,
        isVerified: true,
        isActive: true,
        tags: true,
        coverVideo: true,
        photos: {
          orderBy: { sortOrder: 'asc' },
          take: 5,
          select: { id: true, url: true },
        },
        productImages: {
          where: {
            isApproved: true,
            isActive: true,
            images: { some: {} },
          },
          take: 9,
          select: {
            id: true,
            name: true,
            images: {
              take: 1,
              orderBy: { sortOrder: 'asc' },
              select: { url: true },
            },
          },
        },
        settings: {
          select: {
            shopOpenTime: true,
            shopCloseTime: true,
            shopOpenDays: true,
          },
        },
        branches: {
          where: { isHeadOffice: true },
          take: 1,
          select: { city: true, state: true },
        },
        warehouses: {
          where: { isActive: true, isPickupLocation: true, latitude: { not: null } },
          take: 1,
          select: { latitude: true, longitude: true, city: true },
        },
        products: {
          where: { isApproved: true, isActive: true },
          select: {
            category: {
              select: { id: true, name: true },
            },
          },
          distinct: ['categoryId'],
          take: 5,
        },
        _count: { select: { products: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedSuppliers = suppliers
      .map(supplier => {
        const { products, settings, ...rest } = supplier;
        const categories = [...new Map(
          products
            .filter(p => p.category)
            .map(p => [p.category.id, p.category])
        ).values()];
        const shopStatus = getShopStatus(settings, supplier.isActive);
        const warehouse = supplier.warehouses?.[0];
        let distance = null;
        if (buyerLat && buyerLng && warehouse?.latitude && warehouse?.longitude) {
          distance = haversineDistance(buyerLat, buyerLng, warehouse.latitude, warehouse.longitude);
        }
        let parsedTags = [];
        try {
          parsedTags = supplier.tags ? JSON.parse(supplier.tags) : [];
        } catch { parsedTags = []; }
        const formattedProductImages = (supplier.productImages || []).map(p => ({
          productId: p.id,
          productName: p.name,
          imageUrl: p.images[0]?.url || null,
        })).filter(p => p.imageUrl);

        return { ...rest, tags: parsedTags, categories, shopStatus, productImages: formattedProductImages, distance, isDeliverable: distance !== null ? distance <= maxDistance : null };
      })
      .filter(supplier => {
        // If buyer location provided, only show deliverable suppliers
        if (buyerLat && buyerLng) {
          return supplier.isDeliverable === true;
        }
        // No location provided, show all
        return true;
      });

    return NextResponse.json({ success: true, data: formattedSuppliers });
  } catch (error) {
    console.error("Public suppliers error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch suppliers" },
      { status: 500 }
    );
  }
}