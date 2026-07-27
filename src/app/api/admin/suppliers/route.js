import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const suppliers = await prisma.supplier.findMany({
      select: {
        id: true,
        businessName: true,
        businessType: true,
        description: true,
        logo: true,
        banner: true,
        email: true,
        mobile: true,
        website: true,
        gstin: true,
        pan: true,
        gstVerified: true,
        gstBusinessName: true,
        gstVerificationDate: true,
        isVerified: true,
        isActive: true,
        subscriptionId: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { products: true, warehouses: true } },
        staff: { include: { user: { select: { name: true, email: true } } } },
        warehouses: { take: 3, orderBy: { createdAt: "asc" }, select: { name: true, city: true, state: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(suppliers);
  } catch (error) {
    return errorResponse("Failed to fetch suppliers", 500);
  }
}

// PATCH - Verify/Unverify/Toggle supplier
export async function PATCH(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { supplierId, action } = await request.json();

    if (action === 'verify') {
      await prisma.supplier.update({ where: { id: supplierId }, data: { isVerified: true } });
      return successResponse({ message: 'Supplier verified' });
    }

    if (action === 'unverify') {
      await prisma.supplier.update({ where: { id: supplierId }, data: { isVerified: false } });
      return successResponse({ message: 'Supplier unverified' });
    }

    if (action === 'toggleActive') {
      const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
      await prisma.supplier.update({ where: { id: supplierId }, data: { isActive: !supplier.isActive } });
      return successResponse({ message: 'Supplier status toggled' });
    }

    return errorResponse("Invalid action", 400);
  } catch (error) {
    return errorResponse("Failed to update supplier", 500);
  }
}