import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, mobile: true,
        emailVerified: true, mobileVerified: true, isActive: true,
        lastLogin: true, createdAt: true,
        roles: { include: { role: { select: { name: true } } } },
        buyerProfile: { select: { buyerType: true } },
        supplierStaff: { select: { supplier: { select: { businessName: true, isVerified: true } } } },
        adminProfile: { select: { role: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = users.map((u) => ({
      ...u,
      roles: u.roles.map((r) => r.role.name),
      userType: u.adminProfile ? 'Admin' : u.supplierStaff ? 'Supplier' : u.buyerProfile ? 'Buyer' : 'User',
      supplierName: u.supplierStaff?.supplier?.businessName || null,
      supplierVerified: u.supplierStaff?.supplier?.isVerified || false,
    }));

    return successResponse(formatted);
  } catch (error) {
    return errorResponse("Failed to fetch users", 500);
  }
}

// PATCH - Update user status/role
export async function PATCH(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { userId, action, isActive, roleId } = await request.json();

    if (action === 'toggleActive') {
      await prisma.user.update({ where: { id: userId }, data: { isActive } });
      return successResponse({ message: 'User status updated' });
    }

    if (action === 'verifyEmail') {
      await prisma.user.update({ where: { id: userId }, data: { emailVerified: true } });
      return successResponse({ message: 'Email verified' });
    }

    return errorResponse("Invalid action", 400);
  } catch (error) {
    return errorResponse("Failed to update user", 500);
  }
}