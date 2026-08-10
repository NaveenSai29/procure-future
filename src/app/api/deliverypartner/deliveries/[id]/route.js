import prisma from '@/lib/prisma';
import { getSessionUser, successResponse, errorResponse } from '@/lib/auth';
import { ReferralService } from '@/services/referral.service';

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
        order: {
          include: {
            product: {
              select: {
                supplierId: true,
              },
            },
          },
        },
      },
    });

    if (!delivery) {
      return errorResponse('Delivery not found', 404);
    }

    let updateData = {};
    let orderUpdate = {};
    let responseMessage = '';
    let deliveryCommRate = 0;
    let supplierCommRate = 0;

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

        // Calculate commissions BEFORE transaction
        const { CommissionService } = await import('@/services/commission.service');
        const deliveryFee = delivery.order.deliveryFee || 0;
        const { netEarning, commissionRate: calcDeliveryCommRate } = await CommissionService.calculateDeliveryNetEarning(deliveryFee);
        deliveryCommRate = calcDeliveryCommRate;
        supplierCommRate = await CommissionService.getSupplierCommissionRate();

        updateData = {
          status: 'DELIVERED', deliveryTime: new Date(),
          notes: notes || delivery.notes,
          signatureImage: signatureImage || delivery.signatureImage,
          proofImage: proofImage || delivery.proofImage,
          commissionRate: deliveryCommRate,
        };
        orderUpdate = { status: 'DELIVERED', supplierCommissionRate: supplierCommRate };
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

        const orderDeliveryFee = delivery.order.deliveryFee || 0;
        const orderTotalAmount = delivery.order.totalAmount || 0;
        const isCOD = delivery.order.paymentMethod === 'COD';
        const supplierId = delivery.order.product?.supplierId;

        // Calculate net earning after delivery commission
        const { CommissionService: TxCommissionService } = await import('@/services/commission.service');
        const { netEarning: txNetEarning } = await TxCommissionService.calculateDeliveryNetEarning(orderDeliveryFee);
        const txSupplierCommRate = await TxCommissionService.getSupplierCommissionRate();
        const supplierCommissionAmount = Math.round((orderTotalAmount * txSupplierCommRate) / 100 * 100) / 100;
        const supplierNetAmount = orderTotalAmount - supplierCommissionAmount;

        // Update or create partner wallet — track net earnings + COD
        await tx.partnerWallet.upsert({
          where: { partnerId: user.deliveryPartner.id },
          create: {
            partnerId: user.deliveryPartner.id,
            totalEarned: txNetEarning,
            codCollected: isCOD ? orderTotalAmount : 0,
            codPending: isCOD ? orderTotalAmount : 0,
          },
          update: {
            totalEarned: { increment: txNetEarning },
            ...(isCOD ? {
              codCollected: { increment: orderTotalAmount },
              codPending: { increment: orderTotalAmount },
            } : {}),
          },
        });

        // Process supplier commission on delivery
        try {
          await TxCommissionService.processOrderCommission(delivery.orderId);
        } catch (err) {
          console.error('Commission processing error:', err.message);
        }

        // ============ SETTLEMENT CREATION ============
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        if (isCOD && supplierId) {
          // COD ORDER: Partner collected full amount from buyer
          
          // Create DELIVERY_PARTNER settlement for full COD amount collected
          await tx.settlement.create({
            data: {
              supplierId: supplierId,
              partnerId: user.deliveryPartner.id,
              amount: orderTotalAmount,
              status: 'PENDING',
              settlementType: 'COD_COLLECTION',
              settlementFor: 'DELIVERY_PARTNER',
              referenceId: delivery.orderId,
              periodStart: periodStart,
              periodEnd: periodEnd,
              notes: `COD ₹${orderTotalAmount.toLocaleString('en-IN')} collected from buyer. Awaiting deposit.`,
            },
          });

          // Create SUPPLIER settlement for supplier's share (net after commission)
          await tx.settlement.create({
            data: {
              supplierId: supplierId,
              partnerId: user.deliveryPartner.id,
              amount: supplierNetAmount,
              status: 'PENDING',
              settlementType: 'COD_COLLECTION',
              settlementFor: 'SUPPLIER',
              referenceId: delivery.orderId,
              periodStart: periodStart,
              periodEnd: periodEnd,
              notes: `COD order - Supplier net after ${txSupplierCommRate}% commission (₹${supplierCommissionAmount}). Total: ₹${orderTotalAmount}`,
            },
          });
        } else {
          // ONLINE ORDER: Create DELIVERY_PARTNER settlement for delivery fee earnings
          if (txNetEarning > 0) {
            await tx.settlement.create({
              data: {
                supplierId: supplierId || null,
                partnerId: user.deliveryPartner.id,
                amount: txNetEarning,
                status: 'PENDING',
                settlementType: 'DELIVERY_FEE',
                settlementFor: 'DELIVERY_PARTNER',
                referenceId: delivery.orderId,
                periodStart: periodStart,
                periodEnd: periodEnd,
                notes: `Delivery fee ₹${orderDeliveryFee} - ${deliveryCommRate}% commission = Net ₹${txNetEarning}`,
              },
            });
          }
        }
      }

      return updatedDelivery;
    });

    // Auto-process referral reward after delivery (outside transaction, non-blocking)
    if (action === 'DELIVER' && delivery.order?.buyer?.id) {
      ReferralService.processReferralReward(delivery.order.buyer.id).catch((err) => {
        console.error('Referral reward error:', err.message);
      });
    }

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