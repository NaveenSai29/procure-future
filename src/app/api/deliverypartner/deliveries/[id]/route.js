import prisma from '@/lib/prisma';
import { getSessionUser, successResponse, errorResponse } from '@/lib/auth';
import { ReferralService } from '@/services/referral.service';

// Generate 4-digit OTP
function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Restore stock when order is returned
async function restoreStock(orderId) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { product: true },
    });

    if (!order?.product) return;

    const quantity = order.quantity || 1;

    // Restore product stock
    await prisma.product.update({
      where: { id: order.productId },
      data: {
        stock: { increment: quantity },
      },
    });

    // Create inventory movement log
    await prisma.inventoryMovement.create({
      data: {
        productId: order.productId,
        type: 'RETURN',
        quantity,
        reason: 'Order returned — Customer unavailable',
        orderId: orderId,
      },
    });

    console.log(`✅ Stock restored: +${quantity} units for product ${order.productId}`);
  } catch (error) {
    console.error('Stock restore error:', error.message);
  }
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
            deliveryInstructions: true,
            instructionImages: true,
            instructionAudio: true,
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
    const { action, otp, notes, signatureImage, proofImage, returnLat, returnLng, deliveryLat, deliveryLng, leaveAtDoor, codPaymentMethod } = body;

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
                name: true,
              },
            },
            buyer: {
              select: {
                id: true,
                name: true,
                mobile: true,
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
    let pickupOTP = null;

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
        pickupOTP = orderAmountForOTP >= otpThreshold ? generateOTP() : null;
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
          ...(deliveryLat && { deliveryLat }),
          ...(deliveryLng && { deliveryLng }),
          leaveAtDoor: leaveAtDoor || !!proofImage,
          ...(codPaymentMethod && { codPaymentMethod }),
        };
        orderUpdate = { status: 'DELIVERED', supplierCommissionRate: supplierCommRate };
        responseMessage = 'Order delivered successfully';
        break;

      case 'START_RETURN':
        if (delivery.status !== 'PICKED_UP') {
          return errorResponse('Delivery is not in PICKED_UP status', 400);
        }
        updateData = {
          status: 'RETURNING',
          returnStartedAt: new Date(),
          returnReason: notes || 'Customer not available',
          returnStatus: 'RETURNING',
        };
        orderUpdate = { status: 'RETURNING' };
        responseMessage = 'Return to supplier started';
        break;

      case 'COMPLETE_RETURN':
        if (delivery.status !== 'RETURNING') {
          return errorResponse('Delivery is not in RETURNING status', 400);
        }
        updateData = {
          status: 'RETURNED',
          returnCompletedAt: new Date(),
          returnPhoto: proofImage || delivery.returnPhoto,
          returnNote: notes || delivery.returnNote,
          returnStatus: 'HANDED_OVER',
          ...(returnLat && { returnLat }),
          ...(returnLng && { returnLng }),
        };
        orderUpdate = {
          status: 'RETURNED',
          returnedAt: new Date(),
        };
        responseMessage = 'Order returned to supplier';
        break;

      case 'REJECT':
        if (delivery.status !== 'ASSIGNED') {
          return errorResponse('Delivery is not in ASSIGNED status', 400);
        }
        updateData = { status: 'REJECTED', notes: notes || 'Rejected by delivery partner' };
        responseMessage = 'Delivery rejected';
        break;

      default:
        return errorResponse('Invalid action. Valid actions: ACCEPT, PICKUP, DELIVER, START_RETURN, COMPLETE_RETURN, REJECT', 400);
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
        const isCODWithCash = isCOD && codPaymentMethod !== 'UPI';
        const isCODWithUPI = isCOD && codPaymentMethod === 'UPI';
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
            codCollected: isCODWithCash ? orderTotalAmount : 0,
            codPending: isCODWithCash ? orderTotalAmount : 0,
          },
          update: {
            totalEarned: { increment: txNetEarning },
            ...(isCODWithCash ? {
              codCollected: { increment: orderTotalAmount },
              codPending: { increment: orderTotalAmount },
            } : {}),
            ...(isCODWithUPI ? {
              codCollected: { increment: orderTotalAmount },
            } : {}),
          },
        });

        // Process supplier commission on delivery
        try {
          await TxCommissionService.processOrderCommission(delivery.orderId);
        } catch (err) {
          console.error('Commission processing error:', err.message);
        }

        // Create supplier invoice
        if (supplierId) {
          try {
            const invoiceNumber = `INV-${delivery.orderId.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
            await tx.invoice.create({
              data: {
                supplierId,
                orderId: delivery.orderId,
                invoiceNumber,
                invoiceType: 'TAX_INVOICE',
                amount: orderTotalAmount,
                taxAmount: supplierCommissionAmount,
                totalAmount: supplierNetAmount,
                status: 'PAID',
                items: {
                  create: {
                    description: delivery.order.product?.name || 'Product',
                    productId: delivery.order.productId,
                    quantity: delivery.order.quantity || 1,
                    unitPrice: delivery.order.price || orderTotalAmount,
                    taxRate: txSupplierCommRate,
                    taxAmount: supplierCommissionAmount,
                    totalAmount: supplierNetAmount,
                  },
                },
              },
            });
            console.log(`📄 Supplier invoice created: ${invoiceNumber} — Net: ₹${supplierNetAmount} (${txSupplierCommRate}% commission)`);
          } catch (invErr) {
            console.error('Invoice creation error:', invErr.message);
          }
        }

        // ============ SETTLEMENT CREATION ============
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        if (isCOD && supplierId) {
          // COD ORDER: Handle Cash vs UPI differently
          
          if (isCODWithCash) {
            // CASH: Partner collected cash — needs to deposit later
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
                notes: `COD ₹${orderTotalAmount.toLocaleString('en-IN')} collected as CASH from buyer. Awaiting deposit.`,
              },
            });
          }

          if (isCODWithUPI) {
            // UPI: Money already with PROCURE — no pending deposit
            await tx.settlement.create({
              data: {
                supplierId: supplierId,
                partnerId: user.deliveryPartner.id,
                amount: orderTotalAmount,
                status: 'PROCESSED',
                settlementType: 'COD_COLLECTION',
                settlementFor: 'DELIVERY_PARTNER',
                referenceId: delivery.orderId,
                periodStart: periodStart,
                periodEnd: periodEnd,
                notes: `COD ₹${orderTotalAmount.toLocaleString('en-IN')} collected via UPI QR — money received directly by PROCURE. No deposit needed.`,
              },
            });
          }

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

      if (action === 'COMPLETE_RETURN') {
        // Restore stock outside transaction
        // Note: Stock restore happens after transaction to avoid deadlocks
        setTimeout(() => {
          restoreStock(delivery.orderId).catch(err => {
            console.error('Stock restore failed:', err.message);
          });
        }, 100);

        // Credit return fee to partner
        const returnFeeSetting = await prisma.systemSetting.findFirst({
          where: { category: 'DELIVERY', key: 'returnFeePercent' },
        });
        const returnFeePercent = returnFeeSetting ? parseFloat(returnFeeSetting.value) : 100;
        
        const originalDeliveryFee = delivery.order.deliveryFee || 0;
        const { CommissionService: ReturnCommissionService } = await import('@/services/commission.service');
        const { netEarning: returnNetEarning } = await ReturnCommissionService.calculateDeliveryNetEarning(originalDeliveryFee);
        const returnFeeAmount = Math.round((returnNetEarning * returnFeePercent) / 100 * 100) / 100;

        if (returnFeeAmount > 0) {
          await prisma.partnerWallet.upsert({
            where: { partnerId: user.deliveryPartner.id },
            create: { partnerId: user.deliveryPartner.id, totalEarned: returnFeeAmount },
            update: { totalEarned: { increment: returnFeeAmount } },
          });

          const now = new Date();
          const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

          await prisma.settlement.create({
            data: {
              partnerId: user.deliveryPartner.id,
              amount: returnFeeAmount,
              status: 'PENDING',
              settlementType: 'RETURN_TRIP',
              settlementFor: 'DELIVERY_PARTNER',
              referenceId: delivery.orderId,
              periodStart,
              periodEnd,
              notes: `Return trip — ${returnFeePercent}% of delivery fee (₹${originalDeliveryFee}) = ₹${returnFeeAmount}`,
            },
          });
        }

        // Notify admin about return
        try {
          const { NotificationService } = await import('@/services/notification.service');
          const adminUsers = await tx.userRole.findMany({
            where: {
              role: { name: { in: ['SUPER_ADMIN', 'ADMIN'] } },
            },
            select: { userId: true },
          });
          
          for (const admin of adminUsers) {
            NotificationService.send({
              userId: admin.userId,
              type: 'IN_APP',
              title: '🔄 Order Returned',
              message: `Order #${delivery.orderId.slice(0, 8).toUpperCase()} returned. Partner earned ₹${returnFeeAmount} (${returnFeePercent}% of delivery fee). Reason: ${delivery.returnReason || 'Customer not available'}`,
            }).catch(() => {});
          }
        } catch (notifyErr) {
          console.error('Admin notification error:', notifyErr.message);
        }
      }

      return updatedDelivery;
    });

    // Auto-process referral rewards after delivery (outside transaction, non-blocking)
    if (action === 'DELIVER') {
      // Buyer referral — check if buyer was referred
      if (delivery.order?.buyer?.id) {
        ReferralService.processReferralReward(delivery.order.buyer.id).catch((err) => {
          console.error('Referral reward error:', err.message);
        });
      }
      // Delivery partner referral — check if this partner was referred
      ReferralService.processDeliveryReferralReward(session.userId).catch((err) => {
        console.error('Delivery referral reward error:', err.message);
      });
    }

    // Send OTP to BUYER via notification (NOT to partner)
    if (action === 'PICKUP' && pickupOTP && delivery.order?.buyer?.id) {
      try {
        const { NotificationService } = await import('@/services/notification.service');
        NotificationService.send({
          userId: delivery.order.buyer.id,
          type: 'IN_APP',
          title: '🔐 Delivery OTP',
          message: `Your delivery OTP is ${pickupOTP}. Share this with the delivery partner at your door.`,
        }).catch(() => {});
        console.log(`📱 OTP ${pickupOTP} sent to buyer ${delivery.order.buyer.name}`);
      } catch (notifyErr) {
        console.error('OTP notification error:', notifyErr.message);
      }
    }

    // Return response WITHOUT OTP to partner
    const responseData = { message: responseMessage, delivery: result };
    
    return successResponse(responseData);
  } catch (error) {
    console.error('Update delivery error:', error);
    return errorResponse('Failed to update delivery', 500);
  }
}