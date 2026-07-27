import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

async function checkAdmin(session) {
  if (!session) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { roles: { include: { role: true } } },
  });
  if (!user) return false;
  const userRoles = user.roles.map(r => r.role.name);
  return userRoles.includes('SUPER_ADMIN') || userRoles.includes('ADMIN');
}

// GET - List all platform coupons
export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);
    if (!await checkAdmin(session)) return errorResponse("Access denied", 403);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "ALL";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where = { couponType: "PLATFORM" };
    if (status === "ACTIVE") {
      where.status = "ACTIVE";
      where.startDate = { lte: new Date() };
      where.endDate = { gte: new Date() };
    } else if (status === "EXPIRED") {
      where.endDate = { lt: new Date() };
    } else if (status === "INACTIVE") {
      where.status = "INACTIVE";
    }

    const [coupons, total, activeCount, expiredCount] = await Promise.all([
      prisma.coupon.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.coupon.count({ where }),
      prisma.coupon.count({
        where: {
          couponType: "PLATFORM",
          status: "ACTIVE",
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
      }),
      prisma.coupon.count({
        where: {
          couponType: "PLATFORM",
          endDate: { lt: new Date() },
        },
      }),
    ]);

    return successResponse({
      coupons,
      stats: { total, active: activeCount, expired: expiredCount },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Admin coupons error:", error);
    return errorResponse("Failed to fetch coupons", 500);
  }
}

// POST - Create platform coupon
export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);
    if (!await checkAdmin(session)) return errorResponse("Access denied", 403);

    const {
      code, description, discountType, discountValue,
      minOrderAmount, maxDiscount, usageLimit,
      startDate, endDate, applicableProducts,
    } = await request.json();

    if (!code || !discountValue) {
      return errorResponse("Code and discount value are required", 400);
    }

    if (discountType === "PERCENTAGE" && (discountValue < 1 || discountValue > 100)) {
      return errorResponse("Percentage discount must be between 1 and 100", 400);
    }

    if (discountType === "FIXED" && discountValue <= 0) {
      return errorResponse("Fixed discount must be greater than 0", 400);
    }

    const existing = await prisma.coupon.findFirst({
      where: { code: code.toUpperCase() },
    });
    if (existing) return errorResponse("Coupon code already exists", 409);

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        couponType: "PLATFORM",
        description: description || null,
        discountType: discountType || "PERCENTAGE",
        discountValue: parseFloat(discountValue),
        minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : 0,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        usageLimit: usageLimit ? parseInt(usageLimit) : 100,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        applicableProducts: applicableProducts || null,
        status: "ACTIVE",
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'COUPON_CREATED',
        entity: 'Coupon',
        entityId: coupon.id,
        newValue: { code, discountType, discountValue, couponType: "PLATFORM" },
      },
    });

    return successResponse({
      coupon,
      message: `Platform coupon "${code}" created successfully`,
    }, 201);
  } catch (error) {
    console.error("Create coupon error:", error);
    return errorResponse("Failed to create coupon", 500);
  }
}

// PATCH - Update coupon status (activate/deactivate)
export async function PATCH(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);
    if (!await checkAdmin(session)) return errorResponse("Access denied", 403);

    const { couponId, status, endDate } = await request.json();

    if (!couponId) return errorResponse("couponId required", 400);

    const data = {};
    if (status) data.status = status;
    if (endDate) data.endDate = new Date(endDate);

    const coupon = await prisma.coupon.update({
      where: { id: couponId },
      data,
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'COUPON_UPDATED',
        entity: 'Coupon',
        entityId: couponId,
        newValue: data,
      },
    });

    return successResponse({ coupon, message: "Coupon updated" });
  } catch (error) {
    console.error("Update coupon error:", error);
    return errorResponse("Failed to update coupon", 500);
  }
}