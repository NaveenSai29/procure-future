import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Helper to check if shop is currently open
function getShopStatus(settings, isActive) {
  if (!isActive) return { isOpen: false, reason: 'offline', nextOpenTime: null, closesIn: null };
  if (!settings?.shopOpenTime || !settings?.shopCloseTime) return { isOpen: false, reason: 'not_set', nextOpenTime: null, closesIn: null };

  const now = new Date();
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
    // Find next open day
    let nextDay = new Date(now);
    for (let i = 1; i <= 7; i++) {
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayName = days[nextDay.getDay()];
      if (openDays.includes(nextDayName)) {
        nextDay.setHours(openH, openM, 0, 0);
        return { isOpen: false, reason: 'day_off', nextOpenTime: nextDay.toISOString(), closesIn: null };
      }
    }
    return { isOpen: false, reason: 'day_off', nextOpenTime: null, closesIn: null };
  }

  // Check if within open hours
  if (now >= todayOpen && now < todayClose) {
    const closesInMs = todayClose.getTime() - now.getTime();
    const closesInMin = Math.floor(closesInMs / 60000);
    return { isOpen: true, reason: null, nextOpenTime: null, closesIn: closesInMin };
  }

  // Shop is closed for today - find next open time
  if (now >= todayClose) {
    // Next open is tomorrow (or next open day)
    let nextDay = new Date(now);
    nextDay.setDate(nextDay.getDate() + 1);
    for (let i = 1; i <= 7; i++) {
      const nextDayName = days[nextDay.getDay()];
      if (openDays.includes(nextDayName)) {
        nextDay.setHours(openH, openM, 0, 0);
        return { isOpen: false, reason: 'closed', nextOpenTime: nextDay.toISOString(), closesIn: null };
      }
      nextDay.setDate(nextDay.getDate() + 1);
    }
    return { isOpen: false, reason: 'closed', nextOpenTime: null, closesIn: null };
  }

  // Before opening time today
  todayOpen.setHours(openH, openM, 0, 0);
  return { isOpen: false, reason: 'not_open_yet', nextOpenTime: todayOpen.toISOString(), closesIn: null };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get("supplierId");

    if (supplierId) {
      const supplier = await prisma.supplier.findUnique({
        where: { id: supplierId, isVerified: true, gstVerified: true, isActive: true },
        select: {
          id: true,
          businessName: true,
          businessType: true,
          description: true,
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

      return NextResponse.json({
        success: true,
        data: {
          ...supplierData,
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
        description: true,
        logo: true,
        banner: true,
        gstVerified: true,
        isVerified: true,
        isActive: true,
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

    const formattedSuppliers = suppliers.map(supplier => {
      const { products, settings, ...rest } = supplier;
      const categories = [...new Map(
        products
          .filter(p => p.category)
          .map(p => [p.category.id, p.category])
      ).values()];
      const shopStatus = getShopStatus(settings, supplier.isActive);
      return { ...rest, categories, shopStatus };
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