import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const minPrice = parseFloat(searchParams.get("minPrice") || "0");
    const maxPrice = parseFloat(searchParams.get("maxPrice") || "0");
    const supplierId = searchParams.get("supplierId") || "";

    const where = {
      isApproved: true,
      isActive: true,
      supplier: {
        isVerified: true,
        isActive: true,
      },
      ...(search && {
        OR: [
          { name: { contains: search } },
          { description: { contains: search } },
          { hsnCode: { contains: search } },
          { sku: { contains: search } },
        ],
      }),
      ...(categoryId && { categoryId }),
      ...(supplierId && { supplierId }),
      ...((minPrice > 0 || maxPrice > 0) && {
        pricing: {
          some: {
            sellingPrice: {
              ...(minPrice > 0 && { gte: minPrice }),
              ...(maxPrice > 0 && { lte: maxPrice }),
            },
          },
        },
      }),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          supplier: {
            select: {
              id: true,
              businessName: true,
              isVerified: true,
              gstVerified: true,
              warehouses: {
                where: {
                  isActive: true,
                  isPickupLocation: true,
                  latitude: { not: null },
                  longitude: { not: null }
                },
                take: 1,
                orderBy: { createdAt: 'asc' },
                select: {
                  latitude: true,
                  longitude: true,
                  city: true,
                  state: true,
                  isPickupLocation: true,
                },
              },
            },
          },
          images: { take: 1, orderBy: { sortOrder: "asc" } },
          pricing: {
            orderBy: { minQty: "asc" },
            take: 1,
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.product.count({ where }),
    ]);

    const formattedProducts = products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description?.substring(0, 100),
      category: product.category?.name,
      categoryId: product.category?.id,
      supplier: product.supplier?.businessName,
      supplierId: product.supplier?.id,
      isVerified: product.supplier?.isVerified,
      gstVerified: product.supplier?.gstVerified,
      image: product.images[0]?.url || null,
      price: product.pricing[0]?.sellingPrice || 0,
      mrp: product.pricing[0]?.mrp || 0,
      priceType: product.pricing[0]?.priceType || "RETAIL",
      moq: product.pricing[0]?.minQty || 1,
      rating: product.avgRating || 0,
      reviewCount: product.reviewCount || 0,
      latitude: product.supplier?.warehouses[0]?.latitude || null,
      longitude: product.supplier?.warehouses[0]?.longitude || null,
      warehouseCity: product.supplier?.warehouses[0]?.city || null,
      warehouseState: product.supplier?.warehouses[0]?.state || null,
      isPickupLocation: product.supplier?.warehouses[0]?.isPickupLocation || false,
      createdAt: product.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        products: formattedProducts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Public products error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch products" },
      { status: 500 }
    );
  }
}