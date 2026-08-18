import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

// GET - Get user's wishlist
export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const buyerProfile = await prisma.buyerProfile.findUnique({
      where: { userId: session.userId },
      select: { id: true, wishlist: { include: { items: true } } },
    });

    if (!buyerProfile?.wishlist) {
      return successResponse({ items: [] });
    }

    const productIds = buyerProfile.wishlist.items.map(item => item.productId);

    if (productIds.length === 0) {
      return successResponse({ items: [] });
    }

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        images: { take: 1, orderBy: { sortOrder: "asc" } },
        pricing: { take: 1, orderBy: { minQty: "asc" } },
        supplier: { select: { id: true, businessName: true, isVerified: true } },
      },
    });

    const productMap = {};
    products.forEach(p => { productMap[p.id] = p; });

    const items = buyerProfile.wishlist.items.map(item => {
      const product = productMap[item.productId];
      if (!product) return null;
      return {
        id: item.id,
        productId: item.productId,
        addedAt: item.addedAt,
        name: product.name,
        image: product.images[0]?.url || null,
        price: product.pricing[0]?.sellingPrice || 0,
        mrp: product.pricing[0]?.mrp || 0,
        supplierId: product.supplier?.id,
        supplierName: product.supplier?.businessName,
        isVerified: product.supplier?.isVerified,
      };
    }).filter(Boolean);

    return successResponse({ items });
  } catch (error) {
    console.error("Wishlist GET error:", error);
    return errorResponse("Failed to fetch wishlist", 500);
  }
}

// POST - Toggle wishlist item
export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const body = await request.json();
    const { productId } = body;

    if (!productId) return errorResponse("Product ID required", 422);

    // Get or create buyer profile
    let buyerProfile = await prisma.buyerProfile.findUnique({
      where: { userId: session.userId },
      select: { id: true, wishlist: { select: { id: true } } },
    });

    if (!buyerProfile) {
      buyerProfile = await prisma.buyerProfile.create({
        data: { userId: session.userId, buyerType: "INDIVIDUAL" },
        select: { id: true, wishlist: { select: { id: true } } },
      });
    }

    // Get or create wishlist
    let wishlist = buyerProfile.wishlist;
    if (!wishlist) {
      wishlist = await prisma.wishlist.create({
        data: { buyerId: buyerProfile.id },
      });
    }

    // Check if product already in wishlist
    const existingItem = await prisma.wishlistItem.findFirst({
      where: { wishlistId: wishlist.id, productId },
    });

    if (existingItem) {
      // Remove from wishlist
      await prisma.wishlistItem.delete({ where: { id: existingItem.id } });
      return successResponse({ isBookmarked: false, message: "Removed from wishlist" });
    } else {
      // Add to wishlist
      await prisma.wishlistItem.create({
        data: { wishlistId: wishlist.id, productId },
      });
      return successResponse({ isBookmarked: true, message: "Added to wishlist" });
    }
  } catch (error) {
    console.error("Wishlist POST error:", error);
    return errorResponse("Failed to update wishlist", 500);
  }
}