import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const now = new Date();

    const [coupons, offers] = await Promise.all([
      prisma.coupon.findMany({
        where: {
          status: "ACTIVE",
          startDate: { lte: now },
          endDate: { gte: now },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          code: true,
          description: true,
          discountType: true,
          discountValue: true,
          minOrderAmount: true,
          maxDiscount: true,
          couponType: true,
          endDate: true,
        },
      }),
      prisma.offer.findMany({
        where: {
          status: "ACTIVE",
          startDate: { lte: now },
          endDate: { gte: now },
        },
        orderBy: { priority: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          description: true,
          discountType: true,
          discountValue: true,
          endDate: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: { coupons, offers },
    });
  } catch (error) {
    console.error("Public offers error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch offers", error: error.message },
      { status: 500 }
    );
  }
}