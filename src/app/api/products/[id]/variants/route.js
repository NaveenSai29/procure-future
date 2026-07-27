import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

export async function PUT(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { id } = await params;
    const body = await request.json();
    const { variants } = body;

    if (!variants || !Array.isArray(variants)) {
      return errorResponse("Variants array required", 422);
    }

    // Delete removed variants
    const existingIds = (await prisma.productVariant.findMany({
      where: { productId: id },
      select: { id: true },
    })).map(e => e.id);
    
    const newIds = variants.filter(v => v.id).map(v => v.id);
    const toDelete = existingIds.filter(e => !newIds.includes(e));

    if (toDelete.length > 0) {
      await prisma.productVariant.deleteMany({ where: { id: { in: toDelete } } });
    }

    // Upsert variants
    for (const v of variants) {
      if (!v.name) continue;
      
      const data = {
        name: v.name,
        attributes: v.attributes || {},
        sku: v.sku || null,
        barcode: v.barcode || null,
        price: v.price || null,
        stock: v.stock || 0,
        isActive: v.isActive !== false,
      };

      if (v.id) {
        await prisma.productVariant.update({ where: { id: v.id }, data });
      } else {
        await prisma.productVariant.create({
          data: { ...data, productId: id },
        });
      }
    }

    // Return updated variants
    const updated = await prisma.productVariant.findMany({
      where: { productId: id },
      include: { images: true },
    });

    return successResponse({ variants: updated });
  } catch (error) {
    console.error("Variants error:", error);
    return errorResponse("Failed to update variants", 500);
  }
}