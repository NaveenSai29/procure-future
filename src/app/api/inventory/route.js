import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

// GET - List inventory (with optional summary)
export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const staff = await prisma.supplierStaff.findFirst({
      where: { userId: session.userId },
    });
    if (!staff) return errorResponse("Not a supplier", 403);

    const { searchParams } = new URL(request.url);
    const summary = searchParams.get("summary") === "true";
    const warehouseId = searchParams.get("warehouseId");
    const productId = searchParams.get("productId");

    const where = {
      warehouse: { supplierId: staff.supplierId },
    };
    if (warehouseId) where.warehouseId = warehouseId;
    if (productId) where.productId = productId;

    if (summary) {
      const [totalProducts, totalStock, lowStock, warehouses] = await Promise.all([
        prisma.warehouseInventory.count({ where }),
        prisma.warehouseInventory.aggregate({ where, _sum: { availableQty: true } }),
        prisma.warehouseInventory.count({
          where: {
            ...where,
            availableQty: { lte: prisma.warehouseInventory.fields.minStockLevel },
          },
        }),
        prisma.warehouse.findMany({
          where: { supplierId: staff.supplierId },
          select: { id: true, name: true, city: true, _count: { select: { inventory: true } } },
        }),
      ]);

      return successResponse({
        totalProducts,
        totalStock: totalStock._sum.availableQty || 0,
        lowStock,
        warehouses,
      });
    }

    const inventory = await prisma.warehouseInventory.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true, images: { take: 1 } } },
        warehouse: { select: { id: true, name: true, city: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return successResponse(inventory);
  } catch (error) {
    console.error("Inventory list error:", error);
    return errorResponse("Failed to fetch inventory", 500);
  }
}

// POST - Add/Update inventory in warehouse
export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const staff = await prisma.supplierStaff.findFirst({
      where: { userId: session.userId },
    });
    if (!staff) return errorResponse("Not a supplier", 403);

    const body = await request.json();
    const { warehouseId, productId, quantity, action, minStockLevel } = body;

    if (!warehouseId || !productId || quantity === undefined) {
      return errorResponse("warehouseId, productId, and quantity are required", 422);
    }

    const warehouse = await prisma.warehouse.findFirst({
      where: { id: warehouseId, supplierId: staff.supplierId },
    });
    if (!warehouse) return errorResponse("Warehouse not found", 404);

    const product = await prisma.product.findFirst({
      where: { id: productId, supplierId: staff.supplierId },
    });
    if (!product) return errorResponse("Product not found", 404);

    // Handle SET_MIN_STOCK action
    if (action === "SET_MIN_STOCK") {
      const existing = await prisma.warehouseInventory.findFirst({
        where: { warehouseId, productId },
      });
      if (!existing) return errorResponse("Inventory record not found. Add stock first.", 404);

      await prisma.warehouseInventory.update({
        where: { id: existing.id },
        data: { minStockLevel: quantity },
      });

      await prisma.inventoryMovement.create({
        data: {
          inventoryId: existing.id,
          type: "SETTING_CHANGE",
          quantity: 0,
          referenceType: "MIN_STOCK_UPDATE",
          referenceId: productId,
          notes: `Min stock level changed to ${quantity}`,
        },
      });

      return successResponse({
        message: "Min stock level updated",
        minStockLevel: quantity,
        availableQty: existing.availableQty,
      });
    }

    // Handle ADD / REMOVE / SET actions
    const existing = await prisma.warehouseInventory.findFirst({
      where: { warehouseId, productId },
    });

    let newQty;
    let movementType;

    if (existing) {
      if (action === "ADD") {
        newQty = existing.availableQty + quantity;
        movementType = "STOCK_ADDED";
      } else if (action === "REMOVE") {
        newQty = Math.max(0, existing.availableQty - quantity);
        movementType = "STOCK_REMOVED";
      } else {
        // SET
        newQty = quantity;
        movementType = "STOCK_ADJUSTED";
      }

      await prisma.warehouseInventory.update({
        where: { id: existing.id },
        data: {
          availableQty: newQty,
          ...(minStockLevel !== undefined && { minStockLevel: parseInt(minStockLevel) }),
        },
      });

      // Create movement record
      await prisma.inventoryMovement.create({
        data: {
          inventoryId: existing.id,
          type: movementType,
          quantity: action === "SET" ? newQty - existing.availableQty : action === "ADD" ? quantity : -quantity,
          referenceType: "MANUAL_UPDATE",
          referenceId: productId,
          notes: `${action} stock${minStockLevel !== undefined ? `, min stock set to ${minStockLevel}` : ""}`,
        },
      });
    } else {
      newQty = quantity;
      const inventory = await prisma.warehouseInventory.create({
        data: {
          warehouseId,
          productId,
          availableQty: quantity,
          minStockLevel: minStockLevel ? parseInt(minStockLevel) : 10,
          maxStockLevel: 1000,
        },
      });

      await prisma.inventoryMovement.create({
        data: {
          inventoryId: inventory.id,
          type: "STOCK_ADDED",
          quantity: quantity,
          referenceType: "INITIAL_STOCK",
          referenceId: productId,
          notes: `Initial stock added${minStockLevel ? `, min stock: ${minStockLevel}` : ""}`,
        },
      });
    }

    // Check low stock and create notification
    if (newQty <= (minStockLevel || existing?.minStockLevel || 10) && newQty > 0) {
      await prisma.notification.create({
        data: {
          userId: session.userId,
          type: "LOW_STOCK",
          title: `⚠️ Low Stock Alert: ${product.name}`,
          message: `Only ${newQty} units remaining in ${warehouse.name}. Minimum stock level is ${minStockLevel || existing?.minStockLevel || 10}.`,
        },
      });
    }

    // Out of stock notification
    if (newQty === 0) {
      await prisma.notification.create({
        data: {
          userId: session.userId,
          type: "OUT_OF_STOCK",
          title: `🚨 Out of Stock: ${product.name}`,
          message: `${product.name} is now out of stock in ${warehouse.name}. Please restock soon.`,
        },
      });
    }

    return successResponse({
      message: "Inventory updated",
      availableQty: newQty,
      minStockLevel: minStockLevel || existing?.minStockLevel || 10,
    });
  } catch (error) {
    console.error("Inventory error:", error);
    return errorResponse("Failed to update inventory", 500);
  }
}