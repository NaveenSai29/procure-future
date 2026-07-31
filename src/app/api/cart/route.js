import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

// Helper to get or create cart for a user
async function getOrCreateCart(userId) {
  let buyerProfile = await prisma.buyerProfile.findUnique({
    where: { userId },
    include: { cart: true },
  });

  if (!buyerProfile) {
    buyerProfile = await prisma.buyerProfile.create({
      data: { userId, buyerType: "INDIVIDUAL" },
      include: { cart: true },
    });
  }

  if (!buyerProfile.cart) {
    await prisma.cart.create({
      data: { buyerId: buyerProfile.id },
    });
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

    // Find awarded RFQs with deadline for price expiry
    let awardedRfqs = [];
    try {
      awardedRfqs = await prisma.rFQ.findMany({
        where: {
          buyerId: session.userId,
          status: 'AWARDED',
        },
        select: {
          description: true,
          deadline: true,
        },
      });
    } catch (e) {
      // Ignore RFQ query errors
    }

    const formattedItems = (cart?.items || []).map(item => {
      // Parse RFQ descriptions to find matching product
      let rfqDeadline = null;
      for (const rfq of awardedRfqs) {
        try {
          const desc = JSON.parse(rfq.description || '{}');
          if (desc.productId === item.productId) {
            rfqDeadline = rfq.deadline;
            break;
          }
        } catch (e) {}
      }

      const isExpired = rfqDeadline ? new Date(rfqDeadline) < new Date() : false;
      const hasCustomPrice = !!item.customPrice;

      return {
        id: item.id,
        productId: item.productId,
        productName: item.product?.name,
        supplier: item.product?.supplier?.businessName,
        supplierId: item.product?.supplier?.id,
        isVerified: item.product?.supplier?.isVerified,
        image: item.product?.images[0]?.url || null,
        price: (hasCustomPrice && !isExpired) ? item.customPrice : (item.product?.pricing[0]?.sellingPrice || 0),
        mrp: item.product?.pricing[0]?.mrp || 0,
        isRfqPrice: hasCustomPrice && !isExpired,
        rfqExpiresAt: hasCustomPrice ? (rfqDeadline || null) : null,
        moq: item.product?.pricing[0]?.minQty || 1,
        quantity: item.quantity,
      };
    });

    return successResponse({ id: cart?.id, items: formattedItems });
  } catch (error) {
    console.error("Cart GET error:", error);
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

    // Check product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, isActive: true, isApproved: true },
    });
    if (!product) return errorResponse("Product not found", 404);

    const cartId = await getOrCreateCart(session.userId);

    // Check for active awarded RFQ price (only if customPrice not already passed)
    let rfqPrice = customPrice || null;
    if (!rfqPrice) {
      try {
        const awardedRfqs = await prisma.rFQ.findMany({
          where: {
            buyerId: session.userId,
            status: 'AWARDED',
            deadline: { gt: new Date() },
          },
          select: {
            description: true,
            deadline: true,
            quotations: {
              where: { status: 'ACCEPTED' },
              take: 1,
              orderBy: { createdAt: 'desc' },
              select: {
                items: true,
              },
            },
          },
        });

        for (const rfq of awardedRfqs) {
          try {
            const desc = JSON.parse(rfq.description || '{}');
            if (desc.productId === productId && rfq.quotations?.[0]?.items) {
              const qItem = rfq.quotations[0].items.find(i => i.productId === productId);
              if (qItem?.unitPrice) {
                rfqPrice = qItem.unitPrice;
                break;
              }
            }
          } catch (e) {}
        }
      } catch (e) {
        // Ignore RFQ errors, just add without custom price
      }
    }

    const existing = await prisma.cartItem.findFirst({
      where: { cartId, productId },
    });

    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: existing.quantity + (quantity || 1),
          ...(rfqPrice && { customPrice: parseFloat(rfqPrice) }),
        },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId,
          productId,
          quantity: quantity || 1,
          ...(rfqPrice && { customPrice: parseFloat(rfqPrice) }),
        },
      });
    }

    return successResponse({ message: "Added to cart" });
  } catch (error) {
    console.error("Cart POST error:", error.message);
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