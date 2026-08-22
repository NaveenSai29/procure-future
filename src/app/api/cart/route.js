import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://vantagemarketspvt.com';
function getFullImageUrl(path) { if (!path) return null; if (path.startsWith('http')) return path; return `${BASE_URL}${path}`; }

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

// Helper: Check if shop is currently open based on hours
function getShopStatus(isActive, settings) {
  if (!isActive) return { isOpen: false, reason: 'offline' };
  if (!settings?.shopOpenTime || !settings?.shopCloseTime) return { isOpen: false, reason: 'not_set' };

  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const today = days[now.getDay()];
  let openDays = days;
  try { openDays = settings.shopOpenDays ? JSON.parse(settings.shopOpenDays) : days; } catch {}

  const [oh, om] = settings.shopOpenTime.split(':').map(Number);
  const [ch, cm] = settings.shopCloseTime.split(':').map(Number);
  const tOpen = new Date(now); tOpen.setHours(oh, om, 0, 0);
  const tClose = new Date(now); tClose.setHours(ch, cm, 0, 0);

  if (!openDays.includes(today)) return { isOpen: false, reason: 'day_off' };
  if (now >= tOpen && now < tClose) return { isOpen: true, reason: null };
  return { isOpen: false, reason: 'closed' };
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
          select: {
            id: true, businessName: true, isVerified: true, isActive: true, codEnabled: true,
            settings: { select: { shopOpenTime: true, shopCloseTime: true, shopOpenDays: true } },
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                weight: true,
                supplier: {
                  select: {
                    id: true, businessName: true, isVerified: true, isActive: true, codEnabled: true,
                    settings: { select: { shopOpenTime: true, shopCloseTime: true, shopOpenDays: true } },
                  },
                },
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
      const cartSupplierSettings = cart.supplier?.settings;
      const cartSupplierIsActive = cart.supplier?.isActive;

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

        // Use product supplier settings if available, otherwise cart supplier
        const productSupplier = item.product?.supplier;
        const effectiveIsActive = productSupplier?.isActive ?? cartSupplierIsActive;
        const effectiveSettings = productSupplier?.settings || cartSupplierSettings;

        const formatted = {
          id: item.id,
          productId: item.productId,
          productName: item.product?.name,
          supplier: productSupplier?.businessName || cart.supplier?.businessName,
          supplierId: productSupplier?.id || cart.supplierId,
          isVerified: productSupplier?.isVerified || cart.supplier?.isVerified,
          image: getFullImageUrl(item.product?.images[0]?.url),
          price: (hasCustomPrice && !isExpired) ? item.customPrice : (item.product?.pricing[0]?.sellingPrice || 0),
          mrp: item.product?.pricing[0]?.mrp || 0,
          isRfqPrice: hasCustomPrice && !isExpired,
          rfqExpiresAt: hasCustomPrice ? (rfqDeadline || null) : null,
          moq: item.product?.pricing[0]?.minQty || 1,
          weight: item.product?.weight || 1,
          quantity: item.quantity,
          shopStatus: getShopStatus(effectiveIsActive, effectiveSettings),
        };
        allItems.push(formatted);
        return formatted;
      });

      return {
        id: cart.id,
        supplierId: cart.supplierId,
        supplierName: cart.supplier?.businessName,
        isVerified: cart.supplier?.isVerified,
        codEnabled: cart.supplier?.codEnabled !== false,
        shopStatus: getShopStatus(cartSupplierIsActive, cartSupplierSettings),
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
    const supplierId = searchParams.get("supplierId");

    const buyerProfile = await prisma.buyerProfile.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    });

    if (!buyerProfile) {
      return successResponse({ message: "Cart already empty" });
    }

    // Delete single item
    if (itemId) {
      await prisma.cartItem.delete({ where: { id: itemId } });
      return successResponse({ message: "Removed" });
    }

    // Clear specific supplier's cart
    if (supplierId) {
      const cart = await prisma.cart.findUnique({
        where: {
          buyerId_supplierId: {
            buyerId: buyerProfile.id,
            supplierId,
          },
        },
        select: { id: true },
      });

      if (cart) {
        await prisma.cartItem.deleteMany({
          where: { cartId: cart.id },
        });
      }

      return successResponse({ message: "Supplier cart cleared" });
    }

    // Clear all carts for this buyer
    const carts = await prisma.cart.findMany({
      where: { buyerId: buyerProfile.id },
      select: { id: true },
    });

    if (carts.length > 0) {
      const cartIds = carts.map(c => c.id);
      await prisma.cartItem.deleteMany({
        where: { cartId: { in: cartIds } },
      });
    }

    return successResponse({ message: "All carts cleared" });
  } catch (error) {
    return errorResponse("Failed to remove", 500);
  }
}