import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

async function getSupplierId(userId) {
  const staff = await prisma.supplierStaff.findFirst({ where: { userId } });
  if (staff) return staff.supplierId;
  
  const userWithRoles = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  });
  
  if (userWithRoles) {
    const hasSupplierRole = userWithRoles.roles.some(r => r.role.name === 'SUPPLIER');
    if (hasSupplierRole) {
      const supplier = await prisma.supplier.findFirst({
        where: { email: userWithRoles.email },
      });
      if (supplier) return supplier.id;
    }
  }
  
  return null;
}

export async function GET(req) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get("supplierId");

    if (supplierId) {
      const warehouses = await prisma.warehouse.findMany({
        where: { supplierId },
        select: { id: true, name: true, city: true, state: true, addressLine1: true, pincode: true, isActive: true, isPickupLocation: true },
        orderBy: { createdAt: "asc" },
      });
      return successResponse(warehouses);
    }

    const sid = await getSupplierId(session.userId);
    if (!sid) return successResponse([]);

    const warehouses = await prisma.warehouse.findMany({
      where: { supplierId: sid },
      include: { 
        _count: { select: { inventory: true } },
        inventory: { select: { availableQty: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(warehouses);
  } catch (error) {
    console.error("Warehouses error:", error);
    return errorResponse("Failed to fetch warehouses", 500);
  }
}

export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const body = await request.json();
    const { name, addressLine1, addressLine2, city, state, pincode, latitude, longitude, isPickupLocation } = body;
    if (!name || !addressLine1 || !city || !state || !pincode) {
      return errorResponse("Name, address, city, state, and pincode are required", 422);
    }

    const sid = await getSupplierId(session.userId);
    if (!sid) return errorResponse("Supplier account required", 403);

    const warehouse = await prisma.warehouse.create({
      data: {
        name,
        addressLine1,
        addressLine2: addressLine2 || null,
        city,
        state,
        pincode,
        supplierId: sid,
        latitude: latitude || null,
        longitude: longitude || null,
        isPickupLocation: isPickupLocation !== undefined ? isPickupLocation : true,
      },
    });

    return successResponse({ warehouse, message: "Warehouse created" }, 201);
  } catch (error) {
    console.error("Create warehouse error:", error);
    return errorResponse("Failed to create warehouse", 500);
  }
}