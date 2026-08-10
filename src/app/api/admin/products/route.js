import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

export async function GET(req) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "ALL";
    const supplierId = searchParams.get("supplierId");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where = {};
    
    if (status === "PENDING") {
      where.isApproved = false;
    } else if (status === "APPROVED") {
      where.isApproved = true;
    } else if (status === "INACTIVE") {
      where.isActive = false;
    }
    
    if (supplierId) where.supplierId = supplierId;
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { supplier: { businessName: { contains: search } } },
      ];
    }

    const [products, total, suppliers] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          supplier: { select: { id: true, businessName: true, isVerified: true } },
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
          pricing: { take: 1, orderBy: { minQty: "asc" } },
          inventory: { select: { availableQty: true, warehouse: { select: { name: true } } } },
          _count: { select: { variants: true, images: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
      prisma.supplier.findMany({
        where: { isActive: true },
        select: { id: true, businessName: true },
        orderBy: { businessName: "asc" },
      }),
    ]);

    // Stats
    const [pendingCount, approvedCount, inactiveCount] = await Promise.all([
      prisma.product.count({ where: { isApproved: false } }),
      prisma.product.count({ where: { isApproved: true, isActive: true } }),
      prisma.product.count({ where: { isActive: false } }),
    ]);

    return successResponse({
      products,
      suppliers,
      stats: { pending: pendingCount, approved: approvedCount, inactive: inactiveCount, total },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Admin products error:", error);
    return errorResponse("Failed to fetch products", 500);
  }
}

// PATCH - Approve/Reject/Toggle product
export async function PATCH(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const body = await request.json();
    const { productId, productIds, action, isApproved, isActive } = body;

    // Bulk action
    if (productIds && Array.isArray(productIds) && action) {
      const updateData = {};
      
      if (action === "APPROVE") {
        updateData.isApproved = true;
        updateData.isActive = true;
      } else if (action === "REJECT") {
        updateData.isApproved = false;
        updateData.isActive = false;
      } else if (action === "ACTIVATE") {
        updateData.isActive = true;
      } else if (action === "DEACTIVATE") {
        updateData.isActive = false;
      }

      if (Object.keys(updateData).length === 0) {
        return errorResponse("Invalid action", 400);
      }

      await prisma.product.updateMany({
        where: { id: { in: productIds } },
        data: updateData,
      });

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: `PRODUCT_BULK_${action}`,
          entity: "Product",
          newValue: { count: productIds.length, ...updateData },
        },
      });

      return successResponse({ message: `${productIds.length} products updated` });
    }

    // Single product update
    if (!productId) return errorResponse("productId is required", 400);

    const updateData = {};
    if (isApproved !== undefined) {
      updateData.isApproved = isApproved;
      // When approving, also activate
      if (isApproved) updateData.isActive = true;
    }
    if (isActive !== undefined) updateData.isActive = isActive;

    const product = await prisma.product.update({
      where: { id: productId },
      data: updateData,
    });

    // Notify supplier if approved
    if (isApproved) {
      const supplierStaff = await prisma.supplierStaff.findFirst({
        where: { supplierId: product.supplierId },
        select: { userId: true },
      });
      if (supplierStaff) {
        await prisma.notification.create({
          data: {
            userId: supplierStaff.userId,
            type: "PRODUCT_APPROVED",
            title: "Product Approved ✅",
            message: `Your product "${product.name}" has been approved and is now live.`,
          },
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "PRODUCT_UPDATED",
        entity: "Product",
        entityId: productId,
        newValue: updateData,
      },
    });

    return successResponse(product);
  } catch (error) {
    console.error("Product update error:", error);
    return errorResponse("Failed to update product", 500);
  }
}