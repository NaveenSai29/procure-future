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
          banner: true,
          email: true,
          mobile: true,
          gstin: true,
          gstVerified: true,
          gstBusinessName: true,
          isVerified: true,
          createdAt: true,
          branches: {
            where: { isHeadOffice: true },
            take: 1,
            select: {
              addressLine1: true,
              addressLine2: true,
              city: true,
              state: true,
              pincode: true,
              mobile: true,
              email: true,
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
              addressLine1: true,
              addressLine2: true,
              pincode: true,
            },
          },
          products: {
            where: { isApproved: true, isActive: true },
            select: {
              category: {
                select: { id: true, name: true },
              },
            },
            distinct: ['categoryId'],
            take: 10,
          },
          _count: { select: { products: true } },
        },
      });

      if (!supplier) {
        return NextResponse.json({ success: false, message: "Supplier not found" }, { status: 404 });
      }

      const categories = [...new Map(
        supplier.products
          .filter(p => p.category)
          .map(p => [p.category.id, p.category])
      ).values()];

      const { products, ...supplierData } = supplier;

      return NextResponse.json({
        success: true,
        data: {
          ...supplierData,
          categories,
        },
      });
    }

    // List all verified suppliers
    const suppliers = await prisma.supplier.findMany({
      where: { isVerified: true, isActive: true },
      select: {
        id: true,
        businessName: true,
        businessType: true,
        description: true,
        logo: true,
        banner: true,
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
        products: {
          where: { isApproved: true, isActive: true },
          select: {
            category: {
              select: { id: true, name: true },
            },
          },
          distinct: ['categoryId'],
          take: 5,
        },
        _count: { select: { products: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedSuppliers = suppliers.map(supplier => {
      const { products, ...rest } = supplier;
      const categories = [...new Map(
        products
          .filter(p => p.category)
          .map(p => [p.category.id, p.category])
      ).values()];
      return { ...rest, categories };
    });

    return NextResponse.json({ success: true, data: formattedSuppliers });
  } catch (error) {
    console.error("Public suppliers error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch suppliers" },
      { status: 500 }
    );
  }
}