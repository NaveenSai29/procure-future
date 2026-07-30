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
        buyer: { select: { name: true, email: true, mobile: true } },
        items: true,
        responses: {
          include: {
            supplier: { select: { id: true, businessName: true, isVerified: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        quotations: {
          include: {
            supplier: { select: { id: true, businessName: true, isVerified: true } },
            items: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!rfq) return errorResponse("RFQ not found", 404);

    if (staff) {
      return successResponse({
        ...rfq,
        myResponse: rfq.responses.find(r => r.supplierId === staff.supplierId) || null,
        myQuotation: rfq.quotations.find(q => q.supplierId === staff.supplierId) || null,
        responses: rfq.responses.filter(r => r.supplierId === staff.supplierId),
        quotations: rfq.quotations.filter(q => q.supplierId === staff.supplierId),
      });
    }

    return successResponse({
      ...rfq,
      responses: rfq.responses.map(r => {
        const quotation = rfq.quotations.find(q => q.supplierId === r.supplierId);
        return {
          id: r.id,
          status: r.status,
          message: r.message,
          supplier: r.supplier,
          quotation: quotation ? {
            id: quotation.id,
            totalAmount: quotation.totalAmount,
            deliveryDays: quotation.deliveryDays,
            terms: quotation.terms,
            status: quotation.status,
            items: quotation.items,
            createdAt: quotation.createdAt,
          } : null,
          createdAt: r.createdAt,
        };
      }),
    });
  } catch (error) {
    console.error("RFQ detail error:", error);
    return errorResponse("Failed to fetch RFQ", 500);
  }
}

export async function PATCH(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { id } = await params;
    const body = await request.json();
    const { status, awardedSupplierId } = body;

    const rfq = await prisma.rFQ.findUnique({ where: { id } });
    if (!rfq) return errorResponse("RFQ not found", 404);
    if (rfq.buyerId !== session.userId) return errorResponse("Not your RFQ", 403);

    if (status === 'AWARDED' && awardedSupplierId) {
      await prisma.quotation.updateMany({
        where: { rfqId: id, supplierId: awardedSupplierId },
        data: { status: 'ACCEPTED' },
      });
      await prisma.quotation.updateMany({
        where: { rfqId: id, NOT: { supplierId: awardedSupplierId } },
        data: { status: 'REJECTED' },
      });
    }

    await prisma.rFQ.update({ where: { id }, data: { status } });

    return successResponse({ message: `RFQ ${status.toLowerCase()} successfully` });
  } catch (error) {
    console.error("RFQ update error:", error);
    return errorResponse("Failed to update RFQ", 500);
  }
}