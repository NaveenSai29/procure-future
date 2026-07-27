import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    // Find supplier where user is staff, include user's emailVerified
    const staff = await prisma.supplierStaff.findFirst({
      where: { userId: session.userId },
      include: { 
        supplier: true,
        user: { select: { emailVerified: true } },
      },
    });

    if (!staff) return errorResponse("No supplier account found", 404);

    // Merge emailVerified from User into supplier response
    return successResponse({
      ...staff.supplier,
      emailVerified: staff.user?.emailVerified || false,
    });
  } catch (error) {
    console.error("Get supplier error:", error);
    return errorResponse("Failed to fetch supplier", 500);
  }
}