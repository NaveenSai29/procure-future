import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Haversine distance in km
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

// Helper to calculate shop status
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

  // Shop is closed - find next open time
  if (now >= todayClose) {
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
  return { isOpen: false, reason: 'not_open_yet', nextOpenTime: todayOpen.toISOString(), closesIn: null };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const minPrice = parseFloat(searchParams.get("minPrice") || "0");
    const maxPrice = parseFloat(searchParams.get("maxPrice") || "0");
    const supplierId = searchParams.get("supplierId") || "";
    const buyerLat = parseFloat(searchParams.get("buyerLat") || "0");
    const buyerLng = parseFloat(searchParams.get("buyerLng") || "0");
    const maxDistance = parseFloat(searchParams.get("maxDistance") || "0"); // in km, 0 = no limit
    const hasLocation = buyerLat !== 0 && buyerLng !== 0;

    const where = {
      isApproved: true,
      isActive: true,
      supplier: {
        isVerified: true,
        gstVerified: true,
        isActive: true,
      },
      ...(search && {
        OR: [
        { name: { contains: search } },
        { description: { contains: search } },
        { hsnCode: { contains: search } },
        { sku: { contains: search } },
        { brand: { name: { contains: search } } },
      ],
      }),
      ...(categoryId && { categoryId }),
      ...(supplierId && { supplierId }),
      ...((minPrice > 0 || maxPrice > 0) && {
        pricing: {
          some: {
            sellingPrice: {
              ...(minPrice > 0 && { gte: minPrice }),
              ...(maxPrice > 0 && { lte: maxPrice }),
            },
          },
        },
      }),
    };

    // Fetch all matching products (we'll calculate distance in JS since Prisma can't do it in SQL for MySQL)
    const allProducts = await prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true, logo: true } },
        supplier: {
          select: {
            id: true,
            businessName: true,
            isVerified: true,
            gstVerified: true,
            isActive: true,
            settings: {
              select: {
                shopOpenTime: true,
                shopCloseTime: true,
                shopOpenDays: true,
              },
            },
            warehouses: {
              where: {
                isActive: true,
                isPickupLocation: true,
                latitude: { not: null },
                longitude: { not: null }
              },
              take: 1,
              orderBy: { createdAt: 'asc' },
              select: {
                latitude: true,
                longitude: true,
                city: true,
                state: true,
                isPickupLocation: true,
              },
            },
          },
        },
        images: { take: 1, orderBy: { sortOrder: "asc" } },
        pricing: {
          orderBy: { minQty: "asc" },
          take: 1,
        },
      },
    });

    // Calculate distance for each product
    let formattedProducts = allProducts.map((product) => {
      const lat = product.supplier?.warehouses[0]?.latitude || null;
      const lng = product.supplier?.warehouses[0]?.longitude || null;
      let distance = null;
      if (hasLocation && lat && lng) {
        distance = getDistance(buyerLat, buyerLng, lat, lng);
      }

      // Calculate shop status from supplier settings
      const shopStatus = getShopStatus(product.supplier?.settings, product.supplier?.isActive);
      const shopHours = product.supplier?.settings ? {
        openTime: product.supplier.settings.shopOpenTime,
        closeTime: product.supplier.settings.shopCloseTime,
        openDays: product.supplier.settings.shopOpenDays ? (() => { try { return JSON.parse(product.supplier.settings.shopOpenDays); } catch { return null; } })() : null,
      } : null;

      return {
        id: product.id,
        name: product.name,
        description: product.description?.substring(0, 100),
        category: product.category?.name,
        categoryId: product.category?.id,
        supplier: product.supplier?.businessName,
        supplierId: product.supplier?.id,
        brand: product.brand?.name || null,
        isVerified: product.supplier?.isVerified,
        gstVerified: product.supplier?.gstVerified,
        shopStatus,
        shopHours,
        image: product.images[0]?.url || null,
        price: product.pricing[0]?.sellingPrice || 0,
        mrp: product.pricing[0]?.mrp || 0,
        priceType: product.pricing[0]?.priceType || "RETAIL",
        moq: product.pricing[0]?.minQty || 1,
        rating: product.avgRating || 0,
        reviewCount: product.reviewCount || 0,
        latitude: lat,
        longitude: lng,
        warehouseCity: product.supplier?.warehouses[0]?.city || null,
        warehouseState: product.supplier?.warehouses[0]?.state || null,
        isPickupLocation: product.supplier?.warehouses[0]?.isPickupLocation || false,
        distance,
        createdAt: product.createdAt,
      };
    });

    // Filter by max distance if specified
    if (maxDistance > 0 && hasLocation) {
      formattedProducts = formattedProducts.filter(p => p.distance !== null && p.distance <= maxDistance);
    }

    // Sort
    if (sortBy === 'distance' && hasLocation) {
      formattedProducts.sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return sortOrder === 'asc' ? a.distance - b.distance : b.distance - a.distance;
      });
    } else if (sortBy === 'price') {
      formattedProducts.sort((a, b) => {
        return sortOrder === 'asc' ? a.price - b.price : b.price - a.price;
      });
    } else {
      // Default: sort by createdAt
      formattedProducts.sort((a, b) => {
        const da = new Date(a.createdAt).getTime();
        const db = new Date(b.createdAt).getTime();
        return sortOrder === 'asc' ? da - db : db - da;
      });
    }

    const total = formattedProducts.length;

    // Paginate after sorting
    const paginatedProducts = formattedProducts.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      success: true,
      data: {
        products: paginatedProducts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Public products error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch products" },
      { status: 500 }
    );
  }
}