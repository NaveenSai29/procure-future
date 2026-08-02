import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

// Helper to get or create cart for a user + supplier
async function getOrCreateCart(userId, supplierId) {
  // Get buyer profile
  let buyerProfile = await prisma.buyerProfile.findUnique({
    where: { userId },
  });

  if (!buyerProfile) {
    buyerProfile = await prisma.buyerProfile.create({
      data: { userId, buyerType: "INDIVIDUAL" },
    });
  }

  // Find existing cart for this buyer + supplier
  let cart = await prisma.cart.findUnique({
    where: {
      buyerId_supplierId: {
        buyerId: buyerProfile.id,
        supplierId,
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        buyerId: buyerProfile.id,
        supplierId,
      },
    });
  }

  return cart.id;
}

// Helper to get product supplier
async function getProductSupplier(productId) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { supplierId: true },
  });
  return product?.supplierId || null;
}

export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    // Get all carts for this buyer, grouped by supplier
    const buyerProfile = await prisma.buyerProfile.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    });

    if (!buyerProfile) {
      return successResponse({ carts: [], items: [] });
    }

    const carts = await prisma.cart.findMany({
      where: { buyerId: buyerProfile.id },
      include: {
        supplier: {
          select: { id: true, businessName: true, isVerified: true },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                weight: true,
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

    // Format all items across all carts (for backward compatibility with cartMap)
    const allItems = [];
    const formattedCarts = carts.map(cart => {
      const cartItems = (cart.items || []).map(item => {
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

        const formatted = {
          id: item.id,
          productId: item.productId,
          productName: item.product?.name,
          supplier: item.product?.supplier?.businessName || cart.supplier?.businessName,
          supplierId: item.product?.supplier?.id || cart.supplierId,
          isVerified: item.product?.supplier?.isVerified || cart.supplier?.isVerified,
          image: item.product?.images[0]?.url || null,
          price: (hasCustomPrice && !isExpired) ? item.customPrice : (item.product?.pricing[0]?.sellingPrice || 0),
          mrp: item.product?.pricing[0]?.mrp || 0,
          isRfqPrice: hasCustomPrice && !isExpired,
          rfqExpiresAt: hasCustomPrice ? (rfqDeadline || null) : null,
          moq: item.product?.pricing[0]?.minQty || 1,
          weight: item.product?.weight || 1,
          quantity: item.quantity,
        };
        allItems.push(formatted);
        return formatted;
      });

      return {
        id: cart.id,
        supplierId: cart.supplierId,
        supplierName: cart.supplier?.businessName,
        isVerified: cart.supplier?.isVerified,
        items: cartItems,
        itemCount: cartItems.length,
        subtotal: cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0),
      };
    });

    return successResponse({
      carts: formattedCarts,
      items: allItems, // backward compatibility
    });
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
    const { productId, quantity = 1, customPrice, supplierId } = body;

    if (!productId) return errorResponse("Product ID required", 422);

    // Get product supplier if not provided
    let effectiveSupplierId = supplierId;
    if (!effectiveSupplierId) {
      effectiveSupplierId = await getProductSupplier(productId);
    }
    if (!effectiveSupplierId) return errorResponse("Could not determine supplier", 400);

    // Check product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, isActive: true, isApproved: true },
    });
    if (!product) return errorResponse("Product not found", 404);

    // Get or create cart for this buyer + supplier
    const cartId = await getOrCreateCart(session.userId, effectiveSupplierId);

    // Check for active awarded RFQ price
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
              select: { items: true },
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
        // Ignore RFQ errors
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

    // Return updated carts
    const buyerProfile = await prisma.buyerProfile.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    });

    const carts = await prisma.cart.findMany({
      where: { buyerId: buyerProfile.id },
      select: { id: true, supplierId: true, _count: { select: { items: true } } },
    });

    return successResponse({
      message: "Added to cart",
      cartId,
      supplierId: effectiveSupplierId,
      carts,
    });
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

    if (itemId) {
      // Delete single item
      await prisma.cartItem.delete({ where: { id: itemId } });
      return successResponse({ message: "Removed" });
    } else {
      // Clear all carts for this buyer
      const buyerProfile = await prisma.buyerProfile.findUnique({
        where: { userId: session.userId },
        select: { id: true },
      });

      if (buyerProfile) {
        const carts = await prisma.cart.findMany({
          where: { buyerId: buyerProfile.id },
          select: { id: true },
        });

        const cartIds = carts.map(c => c.id);
        await prisma.cartItem.deleteMany({
          where: { cartId: { in: cartIds } },
        });
      }

      return successResponse({ message: "All carts cleared" });
    }
  } catch (error) {
    return errorResponse("Failed to remove", 500);
  }
}