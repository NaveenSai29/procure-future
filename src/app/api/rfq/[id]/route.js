import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

export async function GET(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { id } = await params;

    const staff = await prisma.supplierStaff.findFirst({ where: { userId: session.userId } });

    const rfq = await prisma.rFQ.findUnique({
      where: { id },
      include: {
        buyer: { select: { name: true, email: true } },
        items: true,
        responses: staff ? { where: { supplierId: staff.supplierId } } : false,
        quotations: staff ? { where: { supplierId: staff.supplierId } } : false,
      },
    });

    if (!rfq) return errorResponse("RFQ not found", 404);

    return successResponse({
      ...rfq,
      myResponse: staff ? rfq.responses[0] || null : null,
      myQuotation: staff ? rfq.quotations[0] || null : null,
    });
  } catch (error) {
    return errorResponse("Failed to fetch RFQ", 500);
  }
}