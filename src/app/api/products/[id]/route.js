import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

// GET single product
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        pricing: true,
        attributes: true,
        images: true,
        variants: true,
        inventory: { include: { warehouse: { select: { id: true, name: true } } } },
      },
    });
    if (!product) return errorResponse("Not found", 404);
    return successResponse(product);
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
      name, categoryId, sku, barcode, hsnCode, unit,
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