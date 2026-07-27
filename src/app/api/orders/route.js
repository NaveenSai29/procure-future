import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";
import { NotificationService } from "@/services/notification.service";
import { getOrderConfirmationEmail } from "@/services/email-templates.service";
import { EmailService } from "@/services/email.service";

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

// POST - Create order with stock validation + notifications
export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const body = await request.json();
    const { productId, quantity } = body;

    if (!productId || !quantity) {
      return errorResponse("Product and quantity required", 422);
    }

    // Get product with supplier info and pricing
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

    // Check inventory
    const inventory = await prisma.warehouseInventory.findFirst({
      where: { productId },
      orderBy: { availableQty: "desc" },
    });

    if (!inventory || inventory.availableQty < quantity) {
      return errorResponse(
        `Insufficient stock. Available: ${inventory?.availableQty || 0}, Requested: ${quantity}`,
        422
      );
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

    // Get buyer info for notifications
    const buyer = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, email: true },
    });

    // Get supplier staff to notify
    const supplierStaff = await prisma.supplierStaff.findFirst({
      where: { supplierId: product.supplierId },
      select: { userId: true },
    });

    // ─── NOTIFICATIONS (non-blocking) ───

    // 1. Send in-app notification to supplier
    if (supplierStaff) {
      NotificationService.send({
        userId: supplierStaff.userId,
        type: 'IN_APP',
        title: '🛒 New Order Received!',
        message: `New order #${order.id.slice(0, 8)} for "${product.name}" — Qty: ${quantity}, Amount: ₹${totalAmount.toLocaleString('en-IN')}`,
      }).catch(err => console.error('Supplier notification failed:', err.message));
    }

    // 2. Send in-app notification to buyer
    NotificationService.send({
      userId: session.userId,
      type: 'IN_APP',
      title: '✅ Order Placed Successfully!',
      message: `Your order #${order.id.slice(0, 8)} for "${product.name}" has been placed. Total: ₹${totalAmount.toLocaleString('en-IN')}`,
    }).catch(err => console.error('Buyer notification failed:', err.message));

    // 3. Send order confirmation email to buyer
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
      }).catch(err => console.error('Order confirmation email failed:', err.message));
    }

    return successResponse({ order }, 201);
  } catch (error) {
    console.error("Create order error:", error);
    return errorResponse("Failed to create order", 500);
  }
}