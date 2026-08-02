import prisma from '@/lib/prisma';
import { getSessionUser, successResponse, errorResponse } from '@/lib/auth';

// Generate 4-digit OTP
function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function GET(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) {
      return errorResponse('Unauthorized', 401);
    }

    const { id } = await params;

    // Get delivery partner profile
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        deliveryPartner: {
          select: { id: true },
        },
      },
    });

    if (!user?.deliveryPartner) {
      return errorResponse('Delivery partner profile not found', 404);
    }

    const delivery = await prisma.delivery.findFirst({
      where: {
        id,
        partnerId: user.deliveryPartner.id,
      },
      include: {
        order: {
          select: {
            id: true,
            totalAmount: true,
            deliveryFee: true,
            paymentMethod: true,
            status: true,
            notes: true,
            createdAt: true,
            buyer: {
              select: {
                id: true,
                name: true,
                mobile: true,
              },
            },
          },
        },
        partner: {
          select: {
            id: true,
            vehicleType: true,
            vehicleNumber: true,
            rating: true,
          },
        },
      },
    });

    if (!delivery) {
      return errorResponse('Delivery not found', 404);
    }

    return successResponse({ delivery });
  } catch (error) {
    console.error('Get delivery detail error:', error);
    return errorResponse('Failed to fetch delivery', 500);
  }
}

export async function PATCH(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) {
      return errorResponse('Unauthorized', 401);
    }

    const { id } = await params;
    const body = await request.json();
    const { action, otp, notes, signatureImage, proofImage } = body;

    // Get delivery partner profile
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        deliveryPartner: {
          select: { id: true },
        },
      },
    });

    if (!user?.deliveryPartner) {
      return errorResponse('Delivery partner profile not found', 404);
    }

    // Find the delivery assigned to this partner
    const delivery = await prisma.delivery.findFirst({
      where: {
        id,
        partnerId: user.deliveryPartner.id,
      },
      include: {
        order: true,
      },
    });

    if (!delivery) {
      return errorResponse('Delivery not found', 404);
    }

    let updateData = {};
    let orderUpdate = {};
    let responseMessage = '';

    switch (action) {
      case 'ACCEPT':
        // Can only accept ASSIGNED deliveries
        if (delivery.status !== 'ASSIGNED') {
          return errorResponse('Delivery is not in ASSIGNED status', 400);
        }
        updateData = {
          status: 'ACCEPTED',
          pickupTime: new Date(),
        };
        orderUpdate = { status: 'PROCESSING' };
        responseMessage = 'Delivery accepted';
        break;

      case 'PICKUP':
        // Can only pickup ACCEPTED deliveries
        if (delivery.status !== 'ACCEPTED') {
          return errorResponse('Delivery is not in ACCEPTED status', 400);
        }
        const pickupOTP = generateOTP();
        updateData = {
          status: 'PICKED_UP',
          otp: pickupOTP,
        };
        orderUpdate = { status: 'SHIPPED' };
        responseMessage = 'Order picked up';
        break;

      case 'DELIVER':
        // Can only deliver PICKED_UP orders
        if (delivery.status !== 'PICKED_UP') {
          return errorResponse('Delivery is not in PICKED_UP status', 400);
        }
        // Verify OTP if provided
        if (otp && otp !== delivery.otp) {
          return errorResponse('Invalid OTP', 400);
        }
        updateData = {
          status: 'DELIVERED',
          deliveryTime: new Date(),
          notes: notes || delivery.notes,
          signatureImage: signatureImage || delivery.signatureImage,
          proofImage: proofImage || delivery.proofImage,
        };
        orderUpdate = { status: 'DELIVERED' };
        responseMessage = 'Order delivered successfully';
        break;

      case 'REJECT':
        // Can only reject ASSIGNED deliveries
        if (delivery.status !== 'ASSIGNED') {
          return errorResponse('Delivery is not in ASSIGNED status', 400);
        }
        updateData = {
          status: 'REJECTED',
          notes: notes || 'Rejected by delivery partner',
        };
        responseMessage = 'Delivery rejected';
        break;

      default:
        return errorResponse('Invalid action. Valid actions: ACCEPT, PICKUP, DELIVER, REJECT', 400);
    }

    // Update delivery and order in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update delivery
      const updatedDelivery = await tx.delivery.update({
        where: { id },
        data: updateData,
        include: {
          order: {
            select: {
              id: true,
              totalAmount: true,
              deliveryFee: true,
              paymentMethod: true,
              status: true,
              buyer: {
                select: { id: true, name: true, mobile: true },
              },
            },
          },
        },
      });

      // Update order status if needed
      if (Object.keys(orderUpdate).length > 0) {
        await tx.order.update({
          where: { id: delivery.orderId },
          data: orderUpdate,
        });

        // Create order status history
        await tx.orderStatusHistory.create({
          data: {
            orderId: delivery.orderId,
            fromStatus: delivery.order.status,
            toStatus: orderUpdate.status,
            changedBy: session.userId,
            notes: notes || action,
          },
        });
      }

      // Update partner stats on delivery
      if (action === 'DELIVER') {
        await tx.deliveryPartner.update({
          where: { id: user.deliveryPartner.id },
          data: {
            totalDeliveries: { increment: 1 },
          },
        });
      }

      return updatedDelivery;
    });

    return successResponse({
      message: responseMessage,
      delivery: result,
    });
  } catch (error) {
    console.error('Update delivery error:', error);
    return errorResponse('Failed to update delivery', 500);
  }
}