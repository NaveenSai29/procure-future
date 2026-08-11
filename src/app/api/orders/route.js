import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";
import { NotificationService } from "@/services/notification.service";
import { getOrderConfirmationEmail } from "@/services/email-templates.service";
import { EmailService } from "@/services/email.service";

// Deduct wallet balance when order is placed
async function deductWallet(userId, amount, referenceId, description) {
  if (!amount || amount <= 0) return null;
  try {
    let wallet = await prisma.buyerWallet.findUnique({
      where: { userId },
    });
    if (!wallet) return null;
    if (wallet.balance < amount) return null;

    const newBalance = wallet.balance - amount;
    await prisma.buyerWallet.update({
      where: { id: wallet.id },
      data: { balance: newBalance },
    });
    const txn = await prisma.buyerWalletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'DEBIT',
        amount,
        referenceType: 'ORDER_PAYMENT',
        referenceId,
        description: description || `Payment for order #${referenceId.slice(0, 8)}`,
        balanceBefore: wallet.balance,
        balanceAfter: newBalance,
      },
    });
    return txn;
  } catch (err) {
    console.error('Wallet deduction error:', err.message);
    return null;
  }
}

// Helper: Check if shop is currently open
async function isShopOpen(supplierId) {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { isActive: true },
    });
    if (!supplier?.isActive) return false;

    const settings = await prisma.supplierSettings.findUnique({
      where: { supplierId },
      select: { shopOpenTime: true, shopCloseTime: true, shopOpenDays: true },
    });

    // If no shop hours set, shop is always open
    if (!settings?.shopOpenTime || !settings?.shopCloseTime) return true;

    const now = new Date();
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const today = days[now.getDay()];

    let openDays = days;
    try {
      openDays = settings.shopOpenDays ? JSON.parse(settings.shopOpenDays) : days;
    } catch { openDays = days; }

    // Not an open day
    if (!openDays.includes(today)) return false;

    const [openH, openM] = settings.shopOpenTime.split(':').map(Number);
    const [closeH, closeM] = settings.shopCloseTime.split(':').map(Number);
    const todayOpen = new Date(now); todayOpen.setHours(openH, openM, 0, 0);
    const todayClose = new Date(now); todayClose.setHours(closeH, closeM, 0, 0);

    return now >= todayOpen && now < todayClose;
  } catch {
    return true; // On error, allow order to go through
  }
}

// Create SLA 0 (Response SLA) for new orders
async function createResponseSLA(orderId, supplierId) {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true, responseSlaHours: true, autoCancelEnabled: true },
    });
    if (supplier?.responseSlaHours > 0 && supplier?.autoCancelEnabled) {
      const deadline = new Date(Date.now() + supplier.responseSlaHours * 60 * 60 * 1000);
      await prisma.orderSLA.create({
        data: {
          orderId,
          supplierId: supplier.id,
          slaType: 'RESPONSE',
          status: 'ACTIVE',
          deadline,
        },
      });
      console.log(`⏱️ SLA 0 (Response) created: Order ${orderId.slice(0,8)} must be accepted by ${deadline.toISOString()}`);
    }
  } catch (err) {
    console.error('SLA 0 creation error:', err.message);
  }
}

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
        title: 'Referral Milestone!',
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
          orderSLA: { select: { id: true, slaType: true, status: true, deadline: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.count({ where }),
    ]);

    // If supplier staff, calculate net amount after commission
    if (staff) {
      const { CommissionService } = await import('@/services/commission.service');
      const liveCommissionRate = await CommissionService.getSupplierCommissionRate();
      const ordersWithNet = orders.map(order => {
        const rate = order.supplierCommissionRate || liveCommissionRate;
        return {
          ...order,
          netAmount: Math.round((order.totalAmount - (order.totalAmount * rate / 100)) * 100) / 100,
        };
      });
      return successResponse({ orders: ordersWithNet, total, page, limit });
    }

    return successResponse({ orders, total, page, limit });
  } catch (error) {
    console.error("Orders error:", error);
    return errorResponse("Failed to fetch orders", 500);
  }
}

// POST - Create order with full fee breakdown + wallet deduction
export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const body = await request.json();
    const { 
      productId, quantity, items, addressId, paymentMethod, couponCode,
      deliveryFee = 0, platformFee = 0, gstAmount = 0,
      couponDiscount = 0, walletDeduction = 0,
      razorpayPaymentId = null,
    } = body;

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

      const totalItems = items.length;
      const perItemDelivery = Math.round(deliveryFee / totalItems);
      const perItemPlatform = Math.round(platformFee / totalItems);
      const perItemGst = Math.round(gstAmount / totalItems);
      const perItemCoupon = Math.round(couponDiscount / totalItems);
      const perItemWallet = Math.round(walletDeduction / totalItems);

      if (walletDeduction > 0) {
        await deductWallet(session.userId, walletDeduction, 'multi-order-pending', 
          `Payment for ${totalItems} items on PROCURE`);
      }

      const createdOrders = [];
      const buyer = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, name: true, email: true },
      });

      // Collect closed shop product IDs
      const closedShopProductIds = [];

      for (const item of items) {
        const product = productMap[item.productId];
        if (!product || !product.isActive || !product.isApproved) continue;

        // Check if supplier's shop is open
        const shopOpen = await isShopOpen(product.supplierId);
        if (!shopOpen) {
          closedShopProductIds.push(item.productId);
          continue;
        }

        const orderPrice = item.customPrice || product.pricing[0]?.sellingPrice || 0;
        const itemTotal = orderPrice * (item.quantity || 1);
        const finalAmount = itemTotal + perItemDelivery + perItemPlatform + perItemGst - perItemCoupon - perItemWallet;

        const order = await prisma.order.create({
          data: {
            buyerId: session.userId,
            productId: item.productId,
            quantity: item.quantity || 1,
            price: orderPrice,
            totalAmount: Math.max(0, finalAmount),
            deliveryFee: perItemDelivery,
            platformFee: perItemPlatform,
            gstAmount: perItemGst,
            couponCode: couponCode || null,
            couponDiscount: perItemCoupon,
            walletDeduction: perItemWallet,
            paymentMethod: (paymentMethod || 'ONLINE').toUpperCase(),
            razorpayPaymentId: razorpayPaymentId || null,
            status: "PENDING",
          },
        });

        createResponseSLA(order.id, product.supplierId).catch(() => {});

        const supplierStaff = await prisma.supplierStaff.findFirst({
          where: { supplierId: product.supplierId },
          select: { userId: true },
        });

        if (supplierStaff) {
          NotificationService.send({
            userId: supplierStaff.userId,
            type: 'IN_APP',
            title: 'New Order Received',
            message: `Order #${order.id.slice(0, 8)} for "${product.name}" - Qty: ${item.quantity || 1}`,
          }).catch(() => {});
        }

        createdOrders.push(order);
      }

      // If some items were skipped due to closed shops, notify
      if (closedShopProductIds.length > 0 && createdOrders.length === 0) {
        return errorResponse("All selected shops are currently closed. Please try again during business hours.", 400);
      }

      if (walletDeduction > 0 && createdOrders.length > 0) {
        const firstOrderId = createdOrders[0].id;
        const orderRefs = createdOrders.map(o => `#${o.id.slice(0, 8)}`).join(', ');
        await prisma.buyerWalletTransaction.updateMany({
          where: { 
            wallet: { userId: session.userId },
            referenceId: 'multi-order-pending',
            type: 'DEBIT',
          },
          data: {
            referenceId: firstOrderId,
            description: `Payment for orders: ${orderRefs}`,
          },
        });
      }

      if (createdOrders.length === 0) {
        return errorResponse("No valid products found to order", 400);
      }

      NotificationService.send({
        userId: session.userId,
        type: 'IN_APP',
        title: 'Order Placed Successfully',
        message: `${createdOrders.length} order(s) placed. Track them in My Orders.${closedShopProductIds.length > 0 ? ` (${closedShopProductIds.length} item(s) skipped - shop closed)` : ''}`,
      }).catch(() => {});

      if (buyer?.email) {
        try {
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
          }).catch((emailErr) => {
            console.log('Email send skipped (non-critical):', emailErr.message);
          });
        } catch (emailErr) {
          console.log('Email template error (non-critical):', emailErr.message);
        }
      }

      try {
        const buyerProfile = await prisma.buyerProfile.findUnique({ where: { userId: session.userId } });
        if (buyerProfile?.cart) {
          await prisma.cartItem.deleteMany({ where: { cartId: buyerProfile.cart.id } });
        }
      } catch (cartErr) {
        console.log('Cart clear error (non-critical):', cartErr.message);
      }

      handleReferralOnPurchase(session.userId).catch(() => {});

      return successResponse({ orders: createdOrders, count: createdOrders.length, skippedClosedShop: closedShopProductIds.length }, 201);
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

    // Check if supplier's shop is open
    const shopOpen = await isShopOpen(product.supplierId);
    if (!shopOpen) {
      return errorResponse("Shop is currently closed. Please try again during business hours.", 400);
    }

    const orderPrice = product.pricing[0]?.sellingPrice || 0;
    const itemTotal = orderPrice * quantity;
    const finalAmount = itemTotal + deliveryFee + platformFee + gstAmount - couponDiscount - walletDeduction;

    const order = await prisma.order.create({
      data: {
        buyerId: session.userId,
        productId,
        quantity,
        price: orderPrice,
        totalAmount: Math.max(0, finalAmount),
        deliveryFee,
        platformFee,
        gstAmount,
        couponCode: couponCode || null,
        couponDiscount,
        walletDeduction,
        paymentMethod: (paymentMethod || 'ONLINE').toUpperCase(),
        razorpayPaymentId: razorpayPaymentId || null,
        status: "PENDING",
      },
    });

    createResponseSLA(order.id, product.supplierId).catch(() => {});

    if (walletDeduction > 0) {
      await deductWallet(
        session.userId, 
        walletDeduction, 
        order.id,
        `Payment for order #${order.id.slice(0, 8)}`
      );
    }

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
        message: `Order #${order.id.slice(0, 8)} for "${product.name}" - Qty: ${quantity}`,
      }).catch(() => {});
    }

    NotificationService.send({
      userId: session.userId,
      type: 'IN_APP',
      title: 'Order Placed Successfully',
      message: `Your order #${order.id.slice(0, 8)} has been placed. Track in My Orders.`,
    }).catch(() => {});

    if (buyer?.email) {
      try {
        const emailTemplate = getOrderConfirmationEmail({
          buyerName: buyer.name,
          orderId: order.id.slice(0, 8).toUpperCase(),
          totalAmount: finalAmount,
          items: [{ name: product.name, quantity, price: finalAmount }],
        });
        EmailService.sendEmail({
          to: buyer.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
        }).catch((emailErr) => {
          console.log('Email send skipped (non-critical):', emailErr.message);
        });
      } catch (emailErr) {
        console.log('Email template error (non-critical):', emailErr.message);
      }
    }

    handleReferralOnPurchase(session.userId).catch(() => {});

    return successResponse({ order }, 201);

  } catch (error) {
    console.error("Create order error:", error);
    return errorResponse("Failed to create order: " + error.message, 500);
  }
}