import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

// GET - List products for current supplier
export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const staff = await prisma.supplierStaff.findFirst({
      where: { userId: session.userId },
    });
    if (!staff) return errorResponse("No supplier account", 404);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";

    const where = {
      supplierId: staff.supplierId,
      ...(search && { name: { contains: search } }),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { name: true } },
          images: { take: 1, orderBy: { sortOrder: "asc" } },
          pricing: { take: 1 },
          variants: { select: { id: true, isActive: true, price: true, images: { take: 1 } } },
          inventory: { select: { availableQty: true, warehouse: { select: { name: true } } } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.count({ where }),
    ]);

    return successResponse({ products, total, page, limit });
  } catch (error) {
    console.error("List products error:", error);
    return errorResponse("Failed to fetch products", 500);
  }
}

// POST - Create product with initial stock
export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const staff = await prisma.supplierStaff.findFirst({
      where: { userId: session.userId },
      include: { supplier: { select: { isVerified: true, gstVerified: true, businessName: true } } },
    });
    if (!staff) return errorResponse("No supplier account", 404);

    // ─── KYC RESTRICTION: Cannot add products without KYC verification ───
    if (!staff.supplier.isVerified) {
      return errorResponse(
        "Your KYC verification is pending. Please complete KYC verification before adding products.",
        403
      );
    }

    const body = await request.json();
    const {
      name, description, longDescription, highlights,
      categoryId, sku, barcode, hsnCode, unit,
      weight, length, width, height, warranty, countryOfOrigin,
      metaTitle, metaDescription, pricing,
      warehouseId, stockQty,
    } = body;

    if (!name || !categoryId) {
      return errorResponse("Name and category are required", 422);
    }

    // Build dimensions string
    const dimensions = (length || width || height) 
      ? `${length || 0}x${width || 0}x${height || 0} cm` 
      : null;

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36);

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description: description || null,
        longDescription: longDescription || null,
        highlights: highlights || null,
        categoryId,
        sku: sku || null,
        barcode: barcode || null,
        hsnCode: hsnCode || null,
        unit: unit || "PCS",
        weight: weight ? parseFloat(weight) : null,
        dimensions: dimensions || null,
        warranty: warranty || null,
        countryOfOrigin: countryOfOrigin || null,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        supplierId: staff.supplierId,
        ...(pricing?.length > 0 && {
          pricing: {
            create: pricing.map((p) => ({
              priceType: p.priceType || "RETAIL",
              mrp: p.mrp || 0,
              sellingPrice: p.sellingPrice || 0,
              minQty: p.minQty || 1,
            })),
          },
        }),
      },
    });

    // Add initial stock if provided
    if (warehouseId && stockQty && parseInt(stockQty) > 0) {
      const warehouse = await prisma.warehouse.findFirst({
        where: { id: warehouseId, supplierId: staff.supplierId },
      });
      
      if (warehouse) {
        const existing = await prisma.warehouseInventory.findFirst({
          where: {
            warehouseId,
            productId: product.id,
            variantId: null,
          },
        });

        if (existing) {
          await prisma.warehouseInventory.update({
            where: { id: existing.id },
            data: { availableQty: { increment: parseInt(stockQty) } },
          });
          await prisma.inventoryMovement.create({
            data: {
              inventoryId: existing.id,
              type: "STOCK_ADDED",
              quantity: parseInt(stockQty),
              referenceType: "PRODUCT_CREATION",
              referenceId: product.id,
              notes: "Initial stock on product creation",
            },
          });
        } else {
          const inventory = await prisma.warehouseInventory.create({
            data: {
              warehouseId,
              productId: product.id,
              availableQty: parseInt(stockQty),
              minStockLevel: 10,
              maxStockLevel: 1000,
            },
          });
          await prisma.inventoryMovement.create({
            data: {
              inventoryId: inventory.id,
              type: "STOCK_ADDED",
              quantity: parseInt(stockQty),
              referenceType: "PRODUCT_CREATION",
              referenceId: product.id,
              notes: "Initial stock on product creation",
            },
          });
        }
      }
    }

    return successResponse({ product }, 201);
  } catch (error) {
    console.error("Create product error:", error);
    return errorResponse(error.message || "Failed to create product", 500);
  }
}