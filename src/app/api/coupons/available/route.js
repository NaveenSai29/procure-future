import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { searchParams } = new URL(request.url);
    const orderTotal = parseFloat(searchParams.get("orderTotal") || "0");

    const coupons = await prisma.coupon.findMany({
      where: {
        status: "ACTIVE",
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
        usageCount: { lt: prisma.coupon.fields.usageLimit },
        ...(orderTotal > 0 && {
          minOrderAmount: { lte: orderTotal },
        }),
      },
      select: {
        id: true,
        code: true,
        description: true,
        discountType: true,
        discountValue: true,
        minOrderAmount: true,
        maxDiscount: true,
        couponType: true,
      },
      orderBy: { discountValue: "desc" },
      take: 10,
    });

    const formattedCoupons = coupons.map(c => {
      let discount = 0;
      if (c.discountType === "PERCENTAGE") {
        discount = Math.round((orderTotal * c.discountValue) / 100);
        if (c.maxDiscount && discount > c.maxDiscount) discount = c.maxDiscount;
      } else {
        discount = c.discountValue;
      }
      return {
        ...c,
        calculatedDiscount: discount,
        label: c.discountType === "PERCENTAGE"
          ? `${c.discountValue}% off (up to ₹${c.maxDiscount?.toLocaleString('en-IN') || '∞'})`
          : `₹${c.discountValue.toLocaleString('en-IN')} off`,
      };
    });

    return successResponse(formattedCoupons);
  } catch (error) {
    console.error("Available coupons error:", error);
    return errorResponse("Failed to fetch coupons", 500);
  }
}