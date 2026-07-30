import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const staff = await prisma.supplierStaff.findFirst({ where: { userId: session.userId } });

    const where = staff
      ? { supplierId: staff.supplierId }
      : { buyerId: session.userId };

    const returns = await prisma.returnRequest.findMany({
      where,
      include: {
        order: { include: { product: { select: { name: true } } } },
        buyer: { select: { name: true, email: true } },
        supplier: { select: { businessName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(returns);
  } catch (error) {
    return errorResponse("Failed to fetch returns", 500);
  }
}

export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const body = await request.json();
    const { orderId, reason, comments } = body;

    if (!orderId || !reason) {
      return errorResponse("Order ID and reason are required", 422);
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { product: { select: { supplierId: true } } },
    });

    if (!order) return errorResponse("Order not found", 404);
    if (order.buyerId !== session.userId) return errorResponse("Not your order", 403);

    const existing = await prisma.returnRequest.findUnique({ where: { orderId } });
    if (existing) return errorResponse("Return already requested for this order", 409);

    const returnReq = await prisma.returnRequest.create({
      data: {
        orderId,
        buyerId: session.userId,
        supplierId: order.product.supplierId,
        reason,
        comments,
        status: "PENDING",
        refundAmount: order.totalAmount,
      },
    });

    return successResponse(returnReq, 201);
  } catch (error) {
    console.error("Return create error:", error);
    return errorResponse("Failed to create return", 500);
  }
}