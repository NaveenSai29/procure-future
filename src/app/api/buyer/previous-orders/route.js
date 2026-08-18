import prisma from "@/lib/prisma";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://vantagemarketspvt.com';
function getFullImageUrl(path) { if (!path) return null; if (path.startsWith('http')) return path; return `${BASE_URL}${path}`; }
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get("supplierId");

    if (!supplierId) return errorResponse("supplierId required", 422);

    // Get previously ordered products from this supplier (distinct, limit 5)
    const orders = await prisma.order.findMany({
      where: {
        buyerId: session.userId,
        product: { supplierId },
        status: { in: ['DELIVERED', 'SHIPPED', 'READY_FOR_PICKUP', 'PROCESSING', 'ACCEPTED'] },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } },
            pricing: { where: { priceType: 'RETAIL' }, take: 1, select: { sellingPrice: true, mrp: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Deduplicate by productId, keep only first 5 unique products
    const seen = new Set();
    const uniqueProducts = [];
    for (const order of orders) {
      if (!seen.has(order.productId) && order.product) {
        seen.add(order.productId);
        uniqueProducts.push({
          id: order.product.id,
          name: order.product.name,
          image: getFullImageUrl(order.product.images[0]?.url),
          price: order.product.pricing[0]?.sellingPrice || 0,
          mrp: order.product.pricing[0]?.mrp || 0,
          lastOrdered: order.createdAt,
        });
      }
      if (uniqueProducts.length >= 5) break;
    }

    return successResponse(uniqueProducts);
  } catch (error) {
    console.error("Previous orders error:", error);
    return errorResponse("Failed to fetch previous orders", 500);
  }
}