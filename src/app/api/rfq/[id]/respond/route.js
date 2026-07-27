import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

export async function POST(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { id } = await params;
    const staff = await prisma.supplierStaff.findFirst({ where: { userId: session.userId } });
    if (!staff) return errorResponse("Not a supplier", 403);

    const existing = await prisma.rFQResponse.findUnique({
      where: { rfqId_supplierId: { rfqId: id, supplierId: staff.supplierId } },
    });
    if (existing) return errorResponse("Already responded", 409);

    await prisma.rFQResponse.create({
      data: { rfqId: id, supplierId: staff.supplierId, status: "PENDING" },
    });

    return successResponse({ message: "Interest registered" }, 201);
  } catch (error) {
    return errorResponse("Failed", 500);
  }
}