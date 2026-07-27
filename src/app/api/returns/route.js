import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const staff = await prisma.supplierStaff.findFirst({ where: { userId: session.userId } });
    if (!staff) return errorResponse("Not a supplier", 403);

    const returns = await prisma.returnRequest.findMany({
      where: { supplierId: staff.supplierId },
      include: {
        order: { include: { product: { select: { name: true } } } },
        buyer: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(returns);
  } catch (error) {
    return errorResponse("Failed to fetch returns", 500);
  }
}