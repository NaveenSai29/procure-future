import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

// Helper to calculate shop status
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

  if (now >= todayOpen && now < todayClose) {
    const closesInMs = todayClose.getTime() - now.getTime();
    const closesInMin = Math.floor(closesInMs / 60000);
    return { isOpen: true, reason: null, nextOpenTime: null, closesIn: closesInMin };
  }

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

  const nextDay = new Date(now);
  nextDay.setHours(openH, openM, 0, 0);
  return { isOpen: false, reason: 'not_open_yet', nextOpenTime: nextDay.toISOString(), closesIn: null };
}

// GET single product
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: { select: { id: true, name: true } },
        pricing: true,
        attributes: true,
        images: true,
        variants: true,
        inventory: { include: { warehouse: { select: { id: true, name: true } } } },
        supplier: { select: { id: true, businessName: true, isVerified: true } },
      },
    });
    if (!product) return errorResponse("Not found", 404);

    // Get supplier settings for shop status
    const [supplierSettings, supplierActive] = await Promise.all([
      prisma.supplierSettings.findUnique({
        where: { supplierId: product.supplierId },
        select: { shopOpenTime: true, shopCloseTime: true, shopOpenDays: true },
      }),
      prisma.supplier.findUnique({
        where: { id: product.supplierId },
        select: { isActive: true },
      }),
    ]);

    const shopStatus = getShopStatus(supplierSettings, supplierActive?.isActive);

    return successResponse({ ...product, shopStatus });
  } catch (error) {
    return errorResponse("Failed to fetch product", 500);
  }
}

// PATCH - Update product
export async function PATCH(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);
    const { id } = await params;
    const body = await request.json();
    const {
      name, categoryId, brandId, sku, barcode, hsnCode, unit,
      description, longDescription, highlights,
      weight, length, width, height, warranty, countryOfOrigin,
      metaTitle, metaDescription, pricing, attributes,
    } = body;

    // Build dimensions string
    const dimensions = (length || width || height)
      ? `${length || 0}x${width || 0}x${height || 0} cm`
      : undefined;

    const updateData = {
      ...(name !== undefined && { name }),
      ...(categoryId !== undefined && { categoryId }),
      ...(brandId !== undefined && { brandId: brandId || null }),
      ...(sku !== undefined && { sku }),
      ...(barcode !== undefined && { barcode }),
      ...(hsnCode !== undefined && { hsnCode }),
      ...(unit !== undefined && { unit }),
      ...(description !== undefined && { description }),
      ...(longDescription !== undefined && { longDescription }),
      ...(highlights !== undefined && { highlights }),
      ...(weight !== undefined && { weight: weight ? parseFloat(weight) : null }),
      ...(dimensions !== undefined && { dimensions }),
      ...(warranty !== undefined && { warranty }),
      ...(countryOfOrigin !== undefined && { countryOfOrigin }),
      ...(metaTitle !== undefined && { metaTitle }),
      ...(metaDescription !== undefined && { metaDescription }),
    };

    if (Object.keys(updateData).length > 0) {
      await prisma.product.update({
        where: { id },
        data: updateData,
      });
    }

    if (pricing) {
      await prisma.productPricing.deleteMany({ where: { productId: id } });
      if (pricing.length > 0) {
        await prisma.productPricing.createMany({
          data: pricing.map(p => ({
            productId: id,
            priceType: p.priceType || "RETAIL",
            mrp: p.mrp,
            sellingPrice: p.sellingPrice,
            minQty: p.minQty || 1,
          })),
        });
      }
    }

    if (attributes) {
      await prisma.productAttribute.deleteMany({ where: { productId: id } });
      if (attributes.length > 0) {
        await prisma.productAttribute.createMany({
          data: attributes.map(a => ({ productId: id, name: a.name, value: a.value })),
        });
      }
    }

    return successResponse({ message: "Updated" });
  } catch (error) {
    return errorResponse("Failed to update", 500);
  }
}

// DELETE product
export async function DELETE(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);
    const { id } = await params;
    await prisma.product.delete({ where: { id } });
    return successResponse({ message: "Deleted" });
  } catch (error) {
    return errorResponse("Failed to delete", 500);
  }
}