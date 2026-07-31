import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";
import { NotificationService } from "@/services/notification.service";
import { getOrderConfirmationEmail } from "@/services/email-templates.service";
import { EmailService } from "@/services/email.service";

// Auto-update referral status on first purchase
async function handleReferralOnPurchase(buyerId) {
  try {
    const buyer = await prisma.user.findUnique({
      where: { id: buyerId },
      select: { id: true, referredBy: true },
    });

    if (!buyer?.referredBy) return;

    const referral = await prisma.referral.findFirst({
      where: {
        referrerId: buyer.referredBy,
        referredId: buyerId,
        status: "REGISTERED",
      },
    });

    if (referral) {
      await prisma.referral.update({
        where: { id: referral.id },
        data: { status: "PURCHASED" },
      });

      const referrer = await prisma.user.findUnique({
        where: { id: buyer.referredBy },
        select: { name: true },
      });

      NotificationService.send({
        userId: buyer.referredBy,
        type: 'IN_APP',
        title: '🎉 Referral Milestone!',
        message: `${referrer?.name || 'Your friend'} just made their first purchase! You'll receive your reward when the order is delivered.`,
      }).catch(() => {});
    }
  } catch (err) {
    console.error('Referral purchase update error:', err.message);
  }
}

// GET - List orders
export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status") || "";

    const staff = await prisma.supplierStaff.findFirst({
      where: { userId: session.userId },
    });

    const where = {
      ...(status && { status }),
      ...(staff
        ? { product: { supplierId: staff.supplierId } }
        : { buyerId: session.userId }),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          product: { select: { name: true } },
          buyer: { select: { name: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.count({ where }),
    ]);

    return successResponse({ orders, total, page, limit });
  } catch (error) {
    console.error("Orders error:", error);
    return errorResponse("Failed to fetch orders", 500);
  }
}

// POST - Create order with auto vehicle assignment by weight
export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const body = await request.json();
    const { productId, quantity, items, addressId, paymentMethod, couponCode } = body;

    // ─── MULTI-ITEM ORDER ───
    if (items && Array.isArray(items) && items.length > 0) {

      const productIds = items.map(i => i.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        include: {
          pricing: { where: { priceType: "RETAIL" }, take: 1 },
          supplier: { select: { id: true, businessName: true } },
        },
      });

      const productMap = {};
      products.forEach(p => { productMap[p.id] = p; });

      const createdOrders = [];
      const buyer = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, name: true, email: true },
      });

      for (const item of items) {
        const product = productMap[item.productId];
        if (!product || !product.isActive || !product.isApproved) continue;

        const orderPrice = item.customPrice || product.pricing[0]?.sellingPrice || 0;
        const totalAmount = orderPrice * (item.quantity || 1);

        const order = await prisma.order.create({
          data: {
            buyerId: session.userId,
            productId: item.productId,
            quantity: item.quantity || 1,
            price: orderPrice,
            totalAmount,
            status: "PENDING",
          },
        });

        // Notify supplier
        const supplierStaff = await prisma.supplierStaff.findFirst({
          where: { supplierId: product.supplierId },
          select: { userId: true },
        });

        if (supplierStaff) {
          NotificationService.send({
            userId: supplierStaff.userId,
            type: 'IN_APP',
            title: 'New Order Received',
            message: `Order #${order.id.slice(0, 8)} for "${product.name}" - Qty: ${item.quantity || 1}, Amount: Rs ${totalAmount.toLocaleString('en-IN')}`,
          }).catch(() => {});
        }

        createdOrders.push(order);
      }

      // Notify buyer
      NotificationService.send({
        userId: session.userId,
        type: 'IN_APP',
        title: 'Order Placed Successfully',
        message: `${createdOrders.length} order(s) placed. Track them in My Orders.`,
      }).catch(() => {});

      // Send email
      if (buyer?.email) {
        const emailTemplate = getOrderConfirmationEmail({
          buyerName: buyer.name,
          orderId: createdOrders[0]?.id?.slice(0, 8)?.toUpperCase(),
          totalAmount: createdOrders.reduce((s, o) => s + o.totalAmount, 0),
          items: createdOrders.map(o => ({
            name: o.product?.name || 'Product',
            quantity: o.quantity,
            price: o.totalAmount,
          })),
        });
        EmailService.sendEmail({
          to: buyer.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
        }).catch(() => {});
      }

      // Clear cart
      const buyerProfile = await prisma.buyerProfile.findUnique({ where: { userId: session.userId } });
      if (buyerProfile?.cart) {
        await prisma.cartItem.deleteMany({ where: { cartId: buyerProfile.cart.id } });
      }

      // Auto-update referral on first purchase
      handleReferralOnPurchase(session.userId).catch(() => {});

      return successResponse({ orders: createdOrders, count: createdOrders.length }, 201);
    }

    // ─── SINGLE PRODUCT ORDER ───
    if (!productId || !quantity) {
      return errorResponse("Product and quantity required", 422);
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        pricing: { where: { priceType: "RETAIL" }, take: 1 },
        supplier: { select: { id: true, businessName: true } },
      },
    });

    if (!product || !product.isActive || !product.isApproved) {
      return errorResponse("Product not available", 404);
    }

    const orderPrice = product.pricing[0]?.sellingPrice || 0;
    const totalAmount = orderPrice * quantity;

    const inventory = await prisma.warehouseInventory.findFirst({
      where: { productId },
      orderBy: { availableQty: "desc" },
    });

    if (!inventory || inventory.availableQty < quantity) {
      return errorResponse(`Insufficient stock. Available: ${inventory?.availableQty || 0}`, 422);
    }

    const order = await prisma.order.create({
      data: {
        buyerId: session.userId,
        productId,
        quantity,
        price: orderPrice,
        totalAmount,
        status: "PENDING",
      },
    });

    const buyer = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, email: true },
    });

    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { supplierId: product.supplierId },
      select: { userId: true },
    });

    if (supplierStaff) {
      NotificationService.send({
        userId: supplierStaff.userId,
        type: 'IN_APP',
        title: 'New Order Received',
        message: `Order #${order.id.slice(0, 8)} for "${product.name}" - Qty: ${quantity}, Amount: Rs ${totalAmount.toLocaleString('en-IN')}`,
      }).catch(() => {});
    }

    NotificationService.send({
      userId: session.userId,
      type: 'IN_APP',
      title: 'Order Placed Successfully',
      message: `Your order #${order.id.slice(0, 8)} has been placed. Track in My Orders.`,
    }).catch(() => {});

    if (buyer?.email) {
      const emailTemplate = getOrderConfirmationEmail({
        buyerName: buyer.name,
        orderId: order.id.slice(0, 8).toUpperCase(),
        totalAmount,
        items: [{ name: product.name, quantity, price: totalAmount }],
      });
      EmailService.sendEmail({
        to: buyer.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      }).catch(() => {});
    }

    // Auto-update referral on first purchase
    handleReferralOnPurchase(session.userId).catch(() => {});

    return successResponse({ order }, 201);

  } catch (error) {
    console.error("Create order error:", error);
    return errorResponse("Failed to create order", 500);
  }
}