import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

export async function POST(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const { id } = await params;
    const staff = await prisma.supplierStaff.findFirst({ where: { userId: session.userId } });
    if (!staff) return errorResponse("Not a supplier", 403);

    const body = await request.json();
    const { items, totalAmount, terms, deliveryDays } = body;

    const existing = await prisma.quotation.findUnique({
      where: { rfqId_supplierId: { rfqId: id, supplierId: staff.supplierId } },
    });
    if (existing) return errorResponse("Quotation already submitted", 409);

    const quotation = await prisma.quotation.create({
      data: {
        rfqId: id,
        supplierId: staff.supplierId,
        totalAmount,
        terms,
        deliveryDays,
        items: {
          create: items.map(i => ({
            rfqItemId: i.rfqItemId,
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.totalPrice,
          })),
        },
      },
    });

    return successResponse({ quotation }, 201);
  } catch (error) {
    console.error("Quote error:", error);
    return errorResponse("Failed to submit quotation", 500);
  }
}