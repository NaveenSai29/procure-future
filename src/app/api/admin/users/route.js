import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const users = await prisma.user.findMany({
      where: {
        // Exclude Super Admin
        NOT: {
          roles: { some: { role: { name: 'SUPER_ADMIN' } } }
        }
      },
      select: {
        id: true, name: true, email: true, mobile: true,
        emailVerified: true, mobileVerified: true, isActive: true,
        lastLogin: true, createdAt: true,
        profileImage: true,
        roles: { include: { role: { select: { name: true } } } },
        buyerProfile: { select: { id: true, buyerType: true } },
        supplierStaff: { 
          select: { 
            id: true,
            supplier: { 
              select: { 
                id: true, businessName: true, isVerified: true, isActive: true,
                _count: { select: { products: true } }
              } 
            } 
          } 
        },
        adminProfile: { select: { id: true, role: true } },
        deliveryPartner: { 
          select: { 
            id: true, isVerified: true, verificationStatus: true, isOnline: true,
            rating: true, totalDeliveries: true,
            activeVehicle: { select: { vehicleType: true, vehicleNumber: true } },
          } 
        },
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = users.map((u) => {
      const isAutoEmail = u.email?.includes('@procure.delivery') || u.email?.includes('@procure.supplier');
      
      let userType = 'User';
      if (u.adminProfile) userType = 'Admin';
      else if (u.deliveryPartner) userType = 'Delivery Partner';
      else if (u.supplierStaff) userType = 'Supplier';
      else if (u.buyerProfile) userType = 'Buyer';

      return {
        id: u.id,
        name: u.name,
        email: isAutoEmail ? null : u.email,
        mobile: u.mobile,
        profileImage: u.profileImage,
        emailVerified: isAutoEmail ? null : u.emailVerified,
        mobileVerified: u.mobileVerified,
        isActive: u.isActive,
        lastLogin: u.lastLogin,
        createdAt: u.createdAt,
        roles: u.roles.map((r) => r.role.name),
        userType,
        isAutoEmail,
        supplier: u.supplierStaff?.supplier ? {
          id: u.supplierStaff.supplier.id,
          businessName: u.supplierStaff.supplier.businessName,
          isVerified: u.supplierStaff.supplier.isVerified,
          productCount: u.supplierStaff.supplier._count.products,
        } : null,
        deliveryPartner: u.deliveryPartner ? {
          id: u.deliveryPartner.id,
          isVerified: u.deliveryPartner.isVerified,
          verificationStatus: u.deliveryPartner.verificationStatus,
          isOnline: u.deliveryPartner.isOnline,
          rating: u.deliveryPartner.rating,
          totalDeliveries: u.deliveryPartner.totalDeliveries,
          vehicle: u.deliveryPartner.activeVehicle?.vehicleType || null,
          vehicleNumber: u.deliveryPartner.activeVehicle?.vehicleNumber || null,
        } : null,
        buyer: u.buyerProfile ? {
          type: u.buyerProfile.buyerType,
          orderCount: u._count.orders,
        } : null,
      };
    });

    return successResponse(formatted);
  } catch (error) {
    console.error("Admin users error:", error);
    return errorResponse("Failed to fetch users", 500);
  }
}

export async function PATCH(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { userId, action, isActive } = await request.json();

    if (action === 'toggleActive') {
      await prisma.user.update({ where: { id: userId }, data: { isActive } });
      return successResponse({ message: `User ${isActive ? 'activated' : 'deactivated'}` });
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