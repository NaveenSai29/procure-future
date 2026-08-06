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
            rating: true,
            currentLat: true,
            currentLng: true,
            activeVehicle: {
              select: { vehicleType: true, vehicleNumber: true },
            },
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
        if (delivery.status !== 'ASSIGNED') {
          return errorResponse('Delivery is not in ASSIGNED status', 400);
        }
        updateData = { status: 'ACCEPTED', pickupTime: new Date() };
        orderUpdate = { status: 'PROCESSING' };
        responseMessage = 'Delivery accepted';
        break;

      case 'PICKUP':
        if (delivery.status !== 'ACCEPTED') {
          return errorResponse('Delivery is not in ACCEPTED status', 400);
        }
        // Check OTP threshold — only generate OTP for orders above threshold
        const otpThresholdSetting = await prisma.systemSetting.findFirst({
          where: { category: 'DELIVERY', key: 'otpThreshold' },
        });
        const otpThreshold = otpThresholdSetting ? parseFloat(otpThresholdSetting.value) : 0;
        const orderAmountForOTP = delivery.order.totalAmount || 0;
        const pickupOTP = orderAmountForOTP >= otpThreshold ? generateOTP() : null;
        updateData = { status: 'PICKED_UP', otp: pickupOTP };
        orderUpdate = { status: 'SHIPPED' };
        responseMessage = 'Order picked up';
        break;

      case 'DELIVER':
        if (delivery.status !== 'PICKED_UP') {
          return errorResponse('Delivery is not in PICKED_UP status', 400);
        }
        // Only validate OTP if one was generated (orders above threshold)
        if (delivery.otp && otp !== delivery.otp) {
          return errorResponse('Invalid OTP', 400);
        }
        updateData = {
          status: 'DELIVERED', deliveryTime: new Date(),
          notes: notes || delivery.notes,
          signatureImage: signatureImage || delivery.signatureImage,
          proofImage: proofImage || delivery.proofImage,
        };
        orderUpdate = { status: 'DELIVERED' };
        responseMessage = 'Order delivered successfully';
        break;

      case 'REJECT':
        if (delivery.status !== 'ASSIGNED') {
          return errorResponse('Delivery is not in ASSIGNED status', 400);
        }
        updateData = { status: 'REJECTED', notes: notes || 'Rejected by delivery partner' };
        responseMessage = 'Delivery rejected';
        break;

      default:
        return errorResponse('Invalid action. Valid actions: ACCEPT, PICKUP, DELIVER, REJECT', 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedDelivery = await tx.delivery.update({
        where: { id },
        data: updateData,
        include: {
          order: {
            select: {
              id: true, totalAmount: true, deliveryFee: true,
              paymentMethod: true, status: true,
              buyer: { select: { id: true, name: true, mobile: true } },
            },
          },
        },
      });

      if (Object.keys(orderUpdate).length > 0) {
        await tx.order.update({ where: { id: delivery.orderId }, data: orderUpdate });
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

      if (action === 'DELIVER') {
        // Increment delivery count
        await tx.deliveryPartner.update({
          where: { id: user.deliveryPartner.id },
          data: { totalDeliveries: { increment: 1 } },
        });

        const deliveryFee = delivery.order.deliveryFee || 0;

        // Update or create partner wallet — track earnings + COD
        await tx.partnerWallet.upsert({
          where: { partnerId: user.deliveryPartner.id },
          create: {
            partnerId: user.deliveryPartner.id,
            totalEarned: deliveryFee,
            codCollected: delivery.order.paymentMethod === 'COD' ? (delivery.order.totalAmount || 0) : 0,
            codPending: delivery.order.paymentMethod === 'COD' ? (delivery.order.totalAmount || 0) : 0,
          },
          update: {
            totalEarned: { increment: deliveryFee },
            ...(delivery.order.paymentMethod === 'COD' ? {
              codCollected: { increment: delivery.order.totalAmount || 0 },
              codPending: { increment: delivery.order.totalAmount || 0 },
            } : {}),
          },
        });

        // COD Settlement: Create settlement entry for tracking
        if (delivery.order.paymentMethod === 'COD') {
          const orderAmount = delivery.order.totalAmount || 0;
          const codAmountToSettle = orderAmount - deliveryFee;

          if (codAmountToSettle > 0) {
            await tx.settlement.create({
              data: {
                supplierId: delivery.order.supplierId,
                partnerId: user.deliveryPartner.id,
                amount: codAmountToSettle,
                status: 'PENDING',
                settlementType: 'COD_COLLECTION',
                referenceId: delivery.orderId,
                notes: `COD ₹${orderAmount} collected. Fee: ₹${deliveryFee}. Net: ₹${codAmountToSettle}`,
              },
            });
          }
        }
      }

      return updatedDelivery;
    });

    // Return OTP on pickup so partner can see it
    const responseData = { message: responseMessage, delivery: result };
    if (action === 'PICKUP') {
      responseData.otp = result.otp;
    }

    return successResponse(responseData);
  } catch (error) {
    console.error('Update delivery error:', error);
    return errorResponse('Failed to update delivery', 500);
  }
}