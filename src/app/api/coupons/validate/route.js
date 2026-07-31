import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { code, orderTotal } = await request.json();
    if (!code) return errorResponse("Coupon code required", 422);

    const coupon = await prisma.coupon.findFirst({
      where: {
        code: code.toUpperCase(),
        status: "ACTIVE",
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
        OR: [
          { couponType: "PLATFORM" },
          { couponType: "SUPPLIER" },
        ],
      },
    });

    if (!coupon) return errorResponse("Invalid or expired coupon code", 404);

    // Check usage limit
    if (coupon.usageCount >= coupon.usageLimit) {
      return errorResponse("Coupon usage limit reached", 400);
    }

    // Check min order amount
    if (orderTotal < coupon.minOrderAmount) {
      return errorResponse(`Minimum order amount of ₹${coupon.minOrderAmount.toLocaleString('en-IN')} required`, 400);
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === "PERCENTAGE") {
      discount = Math.round((orderTotal * coupon.discountValue) / 100);
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.discountValue;
    }

    return successResponse({
      valid: true,
      code: coupon.code,
      discount,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      description: coupon.description,
    });
  } catch (error) {
    console.error("Coupon validate error:", error);
    return errorResponse("Failed to validate coupon", 500);
  }
}