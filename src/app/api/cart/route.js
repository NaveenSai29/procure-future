import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

// Helper to get or create cart for a user
async function getOrCreateCart(userId) {
  // Find buyer profile
  let buyerProfile = await prisma.buyerProfile.findUnique({
    where: { userId },
    include: { cart: true },
  });

  // Create buyer profile if doesn't exist
  if (!buyerProfile) {
    buyerProfile = await prisma.buyerProfile.create({
      data: { userId, buyerType: "INDIVIDUAL" },
      include: { cart: true },
    });
  }

  // Create cart if doesn't exist
  if (!buyerProfile.cart) {
    await prisma.cart.create({
      data: { buyerId: buyerProfile.id },
    });
    // Re-fetch with cart
    buyerProfile = await prisma.buyerProfile.findUnique({
      where: { userId },
      include: { cart: true },
    });
  }

  return buyerProfile.cart.id;
}

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const cartId = await getOrCreateCart(session.userId);

    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                supplier: { select: { id: true, businessName: true, isVerified: true } },
                images: { take: 1, orderBy: { sortOrder: "asc" } },
                pricing: { take: 1, orderBy: { minQty: "asc" } },
              },
            },
          },
        },
      },
    });

    // Get RFQ info for items with customPrice (RFQ accepted items)
    const rfqItems = await prisma.rFQ.findMany({
      where: {
        status: 'AWARDED',
        buyerId: session.userId,
      },
      select: {
        id: true,
        awardedSupplierId: true,
        items: true,
        deadline: true,
      },
    });

    const formattedItems = (cart?.items || []).map(item => {
      // Find matching RFQ for this product
      const rfq = rfqItems.find(r => 
        r.items?.some(i => i.productId === item.productId)
      );

      return {
        id: item.id,
        productId: item.productId,
        productName: item.product?.name,
        supplier: item.product?.supplier?.businessName,
        supplierId: item.product?.supplier?.id,
        isVerified: item.product?.supplier?.isVerified,
        image: item.product?.images[0]?.url || null,
        price: item.customPrice || item.product?.pricing[0]?.sellingPrice || 0,
        mrp: item.product?.pricing[0]?.mrp || 0,
        isRfqPrice: !!item.customPrice,
        rfqExpiresAt: rfq?.deadline || null,
        moq: item.product?.pricing[0]?.minQty || 1,
        quantity: item.quantity,
      };
    });

    return successResponse({ id: cart?.id, items: formattedItems });
  } catch (error) {
    console.error("Cart error:", error);
    return errorResponse("Failed to fetch cart", 500);
  }
}

export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const body = await request.json();
    const { productId, quantity = 1, customPrice } = body;

    if (!productId) return errorResponse("Product ID required", 422);

    const cartId = await getOrCreateCart(session.userId);

    const existing = await prisma.cartItem.findFirst({
      where: { cartId, productId },
    });

    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: existing.quantity + quantity,
          ...(customPrice && { customPrice: parseFloat(customPrice) }),
        },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId,
          productId,
          quantity,
          ...(customPrice && { customPrice: parseFloat(customPrice) }),
        },
      });
    }

    return successResponse({ message: "Added to cart" });
  } catch (error) {
    console.error("Cart add error:", error);
    return errorResponse("Failed to add to cart", 500);
  }
}

export async function PATCH(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const body = await request.json();
    const { itemId, quantity } = body;

    if (!itemId || quantity < 1) return errorResponse("Invalid request", 422);

    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    return successResponse({ message: "Updated" });
  } catch (error) {
    return errorResponse("Failed to update", 500);
  }
}

export async function DELETE(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) return errorResponse("Item ID required", 422);

    await prisma.cartItem.delete({ where: { id: itemId } });

    return successResponse({ message: "Removed" });
  } catch (error) {
    return errorResponse("Failed to remove", 500);
  }
}