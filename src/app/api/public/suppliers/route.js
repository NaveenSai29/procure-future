import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get("supplierId");

    if (supplierId) {
      const supplier = await prisma.supplier.findUnique({
        where: { id: supplierId, isVerified: true, isActive: true },
        select: {
          id: true,
          businessName: true,
          businessType: true,
          description: true,
          logo: true,
          gstVerified: true,
          isVerified: true,
          branches: {
            where: { isHeadOffice: true },
            take: 1,
            select: {
              addressLine1: true,
              city: true,
              state: true,
              pincode: true,
            },
          },
          warehouses: {
            where: { isActive: true, isPickupLocation: true },
            select: {
              id: true,
              name: true,
              city: true,
              state: true,
              latitude: true,
              longitude: true,
              isPickupLocation: true,
            },
          },
          _count: { select: { products: true } },
        },
      });

      if (!supplier) {
        return NextResponse.json({ success: false, message: "Supplier not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: supplier });
    }

    // List all verified suppliers
    const suppliers = await prisma.supplier.findMany({
      where: { isVerified: true, isActive: true },
      select: {
        id: true,
        businessName: true,
        businessType: true,
        logo: true,
        gstVerified: true,
        isVerified: true,
        branches: {
          where: { isHeadOffice: true },
          take: 1,
          select: { city: true, state: true },
        },
        warehouses: {
          where: { isActive: true, isPickupLocation: true, latitude: { not: null } },
          take: 1,
          select: { latitude: true, longitude: true, city: true },
        },
        _count: { select: { products: true } },
      },
    });

    return NextResponse.json({ success: true, data: suppliers });
  } catch (error) {
    console.error("Public suppliers error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch suppliers" },
      { status: 500 }
    );
  }
}