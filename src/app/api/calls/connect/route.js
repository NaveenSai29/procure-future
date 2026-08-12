import prisma from "@/lib/prisma";
import { getSessionUser, successResponse, errorResponse } from "@/lib/auth";
import ExotelService from "@/services/exotel.service";

// POST - Initiate a masked call between buyer and delivery partner
export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse("Not authenticated", 401);

    const body = await request.json();
    const { orderId, callType } = body; // callType: 'buyer_to_partner' | 'partner_to_buyer' | 'buyer_to_supplier'

    if (!orderId) return errorResponse("Order ID required", 422);

    // Get order with buyer and delivery partner details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        buyer: { select: { id: true, name: true, mobile: true } },
        delivery: {
          select: {
            partner: {
              select: {
                user: { select: { name: true, mobile: true } },
              },
            },
          },
        },
        product: {
          select: {
            supplier: { select: { businessName: true, mobile: true } },
          },
        },
      },
    });

    if (!order) return errorResponse("Order not found", 404);

    let toNumber, fromName;

    if (callType === 'partner_to_buyer' || callType === 'buyer_to_partner') {
      // Buyer ↔ Delivery Partner
      const buyerMobile = order.buyer?.mobile;
      const partnerMobile = order.delivery?.partner?.user?.mobile;

      if (!buyerMobile || !partnerMobile) {
        return errorResponse("Phone numbers not available", 400);
      }

      if (callType === 'buyer_to_partner') {
        toNumber = partnerMobile;
        fromName = order.buyer?.name;
      } else {
        toNumber = buyerMobile;
        fromName = order.delivery?.partner?.user?.name;
      }
    } else if (callType === 'buyer_to_supplier') {
      // Buyer → Supplier
      const buyerMobile = order.buyer?.mobile;
      const supplierMobile = order.product?.supplier?.mobile;

      if (!buyerMobile || !supplierMobile) {
        return errorResponse("Phone numbers not available", 400);
      }

      toNumber = supplierMobile;
      fromName = order.buyer?.name;
    } else {
      return errorResponse("Invalid call type", 400);
    }

    // Initiate masked call via Exotel
    const result = await ExotelService.connectCall(toNumber, fromName, orderId);

    if (!result.success) {
      return errorResponse(result.error || "Failed to connect call", 500);
    }

    // Log call in database (optional)
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: 'MASKED_CALL_INITIATED',
          entity: 'Order',
          entityId: orderId,
          newValue: { callType, callSid: result.callSid },
        },
      });
    } catch {}

    return successResponse({
      message: "Call initiated",
      proxyNumber: result.proxyNumber,
      callSid: result.callSid,
      // Return proxy number so app can dial it
      dialNumber: result.proxyNumber,
    });
  } catch (error) {
    console.error("Call connect error:", error);
    return errorResponse("Failed to connect call", 500);
  }
}