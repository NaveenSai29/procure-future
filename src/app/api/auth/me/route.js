import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return errorResponse("Not authenticated", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
        select: {
        id: true,
        name: true,
        email: true,
        newEmail: true,
        emailVerified: true,
        mobile: true,
        mobileVerified: true,
        profileImage: true,
        lastLogin: true,
        createdAt: true,
        roles: {
          include: { role: { select: { name: true } } },
        },
        buyerProfile: {
          select: { id: true, buyerType: true, companyName: true },
        },
      },
    });

    if (!user) {
      return errorResponse("User not found", 404);
    }

    return successResponse({
      ...user,
      roles: user.roles.map((r) => r.role.name),
    });
  } catch (error) {
    console.error("Get user error:", error);
    return errorResponse("Failed to get user", 500);
  }
}