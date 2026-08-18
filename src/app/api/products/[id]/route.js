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
    return { isOpen: false, reason: 'day_off', nextOpenTime: `${String(openH).padStart(2, '0')}:${String(openM).padStart(2, '0')}`, nextOpenDay: 'Tomorrow', closesIn: null };
  }

  if (now >= todayOpen && now < todayClose) {
    const closesInMs = todayClose.getTime() - now.getTime();
    const closesInMin = Math.floor(closesInMs / 60000);
    return { isOpen: true, reason: null, nextOpenTime: null, closesIn: closesInMin };
  }

  if (now >= todayClose) {
    return { isOpen: false, reason: 'closed', nextOpenTime: `${String(openH).padStart(2, '0')}:${String(openM).padStart(2, '0')}`, nextOpenDay: 'Tomorrow', closesIn: null };
  }

  return { isOpen: false, reason: 'not_open_yet', nextOpenTime: `${String(openH).padStart(2, '0')}:${String(openM).padStart(2, '0')}`, nextOpenDay: 'Today', closesIn: null };
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
      isActive, isApproved, rejectionReason,
      warehouseId, stockQty, variants,
    } = body;

    // Build dimensions string
    const dimensions = (length || width || height)
      ? `${length || 0}x${width || 0}x${height || 0} cm`
      : undefined;

    // Build slug if name is being updated
    const slug = name !== undefined
      ? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36)
      : undefined;

    const updateData = {
      ...(name !== undefined && { name }),
      ...(slug !== undefined && { slug }),
      ...(categoryId !== undefined && { categoryId }),
      ...(brandId !== undefined && { brandId: brandId || null }),
      ...(isActive !== undefined && { isActive }),
      ...(isApproved !== undefined && { isApproved }),
      ...(rejectionReason !== undefined && { rejectionReason }),
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

    // Handle pricing updates
    if (pricing !== undefined) {
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

    // Handle attributes updates
    if (attributes !== undefined) {
      await prisma.productAttribute.deleteMany({ where: { productId: id } });
      if (attributes.length > 0) {
        await prisma.productAttribute.createMany({
          data: attributes.map(a => ({ productId: id, name: a.name, value: a.value })),
        });
      }
    }

    // Handle variants updates
    if (variants !== undefined) {
      // Delete existing variants that are not in the new list
      const existingVariants = await prisma.productVariant.findMany({
        where: { productId: id },
        select: { id: true },
      });
      
      // Delete all existing variants
      await prisma.productVariant.deleteMany({ where: { productId: id } });
      
      // Create new variants
      if (variants.length > 0) {
        await prisma.productVariant.createMany({
          data: variants.map(v => ({
            productId: id,
            name: v.value || v.name || 'Variant',
            sku: v.sku || null,
            price: v.sellingPrice ? parseFloat(v.sellingPrice) : null,
            stock: 0,
            isActive: true,
            attributes: { type: v.type || 'Variant' },
          })),
        });
      }
    }

    // Handle stock/inventory updates
    if (warehouseId !== undefined && stockQty !== undefined) {
      const stockQtyNum = stockQty ? parseInt(stockQty) : 0;
      
      if (warehouseId) {
        // Check if inventory exists for this warehouse + product
        const existingInventory = await prisma.warehouseInventory.findFirst({
          where: {
            warehouseId,
            productId: id,
            variantId: null,
          },
        });

        if (existingInventory) {
          // Update stock
          const oldQty = existingInventory.availableQty;
          const difference = stockQtyNum - oldQty;
          
          await prisma.warehouseInventory.update({
            where: { id: existingInventory.id },
            data: { availableQty: stockQtyNum },
          });

          // Log inventory movement
          if (difference !== 0) {
            await prisma.inventoryMovement.create({
              data: {
                inventoryId: existingInventory.id,
                type: difference > 0 ? 'STOCK_ADDED' : 'STOCK_REMOVED',
                quantity: Math.abs(difference),
                referenceType: 'PRODUCT_UPDATE',
                referenceId: id,
                notes: difference > 0 
                  ? `Stock updated: +${difference} (${oldQty} → ${stockQtyNum})` 
                  : `Stock updated: ${difference} (${oldQty} → ${stockQtyNum})`,
              },
            });
          }
        } else {
          // Create new inventory
          const newInventory = await prisma.warehouseInventory.create({
            data: {
              warehouseId,
              productId: id,
              availableQty: stockQtyNum,
              minStockLevel: 10,
              maxStockLevel: 1000,
            },
          });

          if (stockQtyNum > 0) {
            await prisma.inventoryMovement.create({
              data: {
                inventoryId: newInventory.id,
                type: 'STOCK_ADDED',
                quantity: stockQtyNum,
                referenceType: 'PRODUCT_UPDATE',
                referenceId: id,
                notes: `Initial stock set to ${stockQtyNum}`,
              },
            });
          }
        }
      }
    }

    // Fetch updated product with all relations
    const updatedProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: { select: { id: true, name: true } },
        pricing: true,
        images: true,
        variants: true,
        inventory: { include: { warehouse: { select: { id: true, name: true } } } },
      },
    });

    return successResponse({ message: "Updated", product: updatedProduct });
  } catch (error) {
    console.error("Update product error:", error);
    return errorResponse(error.message || "Failed to update", 500);
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