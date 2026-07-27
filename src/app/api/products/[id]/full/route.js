import prisma from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/auth";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, businessName: true } },
        images: { orderBy: { sortOrder: "asc" } },
        pricing: { orderBy: { minQty: "asc" } },
        attributes: true,
        variants: {
          where: { isActive: true },
          include: { images: { orderBy: { sortOrder: "asc" } } },
          orderBy: { createdAt: "asc" },
        },
        inventory: { take: 1 },
      },
    });

    if (!product) return errorResponse("Product not found", 404);

    return successResponse(product);
  } catch (error) {
    console.error("Full product error:", error);
    return errorResponse("Failed to fetch product", 500);
  }
}