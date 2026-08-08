import prisma from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/auth';

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Auto-check and cancel breached SLA orders with professional messages
async function checkBreachedSLAs() {
  try {
    const now = new Date();
    const breached = await prisma.orderSLA.findMany({
      where: { status: 'ACTIVE', deadline: { lt: now } },
      include: {
        order: { select: { id: true, status: true, buyerId: true, totalAmount: true, paymentMethod: true, razorpayPaymentId: true, walletDeduction: true } },
        supplier: { select: { id: true, businessName: true } },
      },
    });

    for (const sla of breached) {
      try {
        let shouldCancel = false;
        let newStatus = 'CANCELLED';
        let cancelNote = '';

        if (sla.slaType === 'RESPONSE' && sla.order.status === 'PENDING') {
          shouldCancel = true;
          newStatus = 'EXPIRED';
          cancelNote = `Auto-expired: ${sla.supplier.businessName} did not respond within the time limit. Deadline was ${sla.deadline.toISOString()}`;
        } else if (sla.slaType === 'PROCESSING' && ['ACCEPTED', 'PROCESSING'].includes(sla.order.status)) {
          shouldCancel = true;
          newStatus = 'EXPIRED';
          cancelNote = `Auto-expired: ${sla.supplier.businessName} could not prepare the order in time. Deadline was ${sla.deadline.toISOString()}`;
        } else if (sla.slaType === 'PICKUP' && sla.order.status === 'READY_FOR_PICKUP') {
          shouldCancel = true;
          newStatus = 'CANCELLED';
          cancelNote = `Auto-cancelled: No delivery agent picked up the order within the time limit. Deadline was ${sla.deadline.toISOString()}`;
        }

        if (shouldCancel) {
          await prisma.order.update({ where: { id: sla.orderId }, data: { status: newStatus } });
          await prisma.orderStatusHistory.create({
            data: {
              orderId: sla.orderId,
              fromStatus: sla.order.status,
              toStatus: newStatus,
              changedBy: 'SYSTEM',
              notes: cancelNote,
            },
          });

          if (sla.order.paymentMethod === 'ONLINE' && sla.order.razorpayPaymentId) {
            try {
              const { RazorpayService } = await import('@/services/razorpay.service');
              await RazorpayService.createRefund({ paymentId: sla.order.razorpayPaymentId });
              await prisma.refundTransaction.create({
                data: { orderId: sla.orderId, userId: sla.order.buyerId, amount: sla.order.totalAmount, paymentMethod: 'RAZORPAY', transactionId: sla.order.razorpayPaymentId, status: 'PROCESSED', processedAt: new Date() },
              });
            } catch (err) { console.error('Refund error:', err.message); }
          }
          if (sla.order.walletDeduction > 0) {
            const wallet = await prisma.buyerWallet.findUnique({ where: { userId: sla.order.buyerId } });
            if (wallet) {
              await prisma.buyerWallet.update({ where: { id: wallet.id }, data: { balance: wallet.balance + sla.order.walletDeduction } });
            }
          }

          const slaMessages = {
            RESPONSE: { title: '⏰ Order Expired', message: `Order #${sla.orderId.slice(0, 8).toUpperCase()} expired — ${sla.supplier.businessName} did not respond within the time limit. ₹${sla.order.totalAmount?.toLocaleString('en-IN')} refunded.` },
            PROCESSING: { title: '⏰ Order Expired', message: `Order #${sla.orderId.slice(0, 8).toUpperCase()} expired — ${sla.supplier.businessName} could not prepare your order in time. ₹${sla.order.totalAmount?.toLocaleString('en-IN')} refunded.` },
            PICKUP: { title: '❌ Order Cancelled', message: `Order #${sla.orderId.slice(0, 8).toUpperCase()} cancelled — no delivery agent was available for pickup. ₹${sla.order.totalAmount?.toLocaleString('en-IN')} refunded.` },
          };
          const msg = slaMessages[sla.slaType];
          if (msg) {
            try {
              const { NotificationService } = await import('@/services/notification.service');
              NotificationService.send({ userId: sla.order.buyerId, type: 'IN_APP', title: msg.title, message: msg.message }).catch(() => {});
            } catch (notifErr) { console.error('Notification error:', notifErr.message); }
          }

          console.log(`❌ SLA ${sla.slaType} Breached: Order ${sla.orderId.slice(0, 8)} → ${newStatus}`);
        }

        await prisma.orderSLA.update({ where: { id: sla.id }, data: { status: 'BREACHED', breachedAt: now } });
      } catch (err) { console.error('SLA processing error:', err.message); }
    }
  } catch (err) { console.error('SLA check error:', err.message); }
}

// POST - Auto-assign delivery partner when order is READY_FOR_PICKUP
export async function POST(request) {
  try {
    // 🔄 Auto-check breached SLAs on every delivery action
    checkBreachedSLAs().catch(() => {});

    const body = await request.json();
    const { orderId } = body;

    if (!orderId) return errorResponse('orderId required', 400);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        product: {
          include: {
            supplier: {
              include: {
                warehouses: {
                  where: { isActive: true, isPickupLocation: true },
                  take: 1,
                },
                dedicatedAgents: {
                  select: { partnerId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!order) return errorResponse('Order not found', 404);

    const existingDelivery = await prisma.delivery.findUnique({ where: { orderId } });
    if (existingDelivery) return errorResponse('Delivery already assigned', 400);

    const supplier = order.product?.supplier;
    const isCOD = order.paymentMethod === 'COD';
    const dedicatedAgentIds = supplier?.dedicatedAgents?.map(a => a.partnerId) || [];

    const rangeSetting = await prisma.systemSetting.findFirst({
      where: { category: 'DELIVERY', key: 'autoAssignRange' },
    });
    const maxRange = rangeSetting ? parseFloat(rangeSetting.value) : 7;

    const codMaxPendingSetting = await prisma.systemSetting.findFirst({
      where: { category: 'DELIVERY', key: 'codMaxPending' },
    });
    const codMaxPending = codMaxPendingSetting ? parseFloat(codMaxPendingSetting.value) : 5000;

    let codGlobalEnabled = true;
    if (isCOD) {
      const codGlobalSetting = await prisma.systemSetting.findFirst({
        where: { category: 'DELIVERY', key: 'codGlobalEnabled' },
      });
      codGlobalEnabled = codGlobalSetting ? codGlobalSetting.value !== 'false' : true;
    }

    const warehouse = order.product?.supplier?.warehouses?.[0];
    const pickupLat = warehouse?.latitude || 12.9716;
    const pickupLng = warehouse?.longitude || 77.5946;

    let eligiblePartnerFilter = {
      isOnline: true,
      isVerified: true,
      currentLat: { not: null },
      currentLng: { not: null },
    };

    if (isCOD && codGlobalEnabled && supplier?.codEnabled && order.totalAmount > (supplier.codThreshold || 2000) && dedicatedAgentIds.length > 0) {
      eligiblePartnerFilter.id = { in: dedicatedAgentIds };
    }

    const onlinePartners = await prisma.deliveryPartner.findMany({
      where: eligiblePartnerFilter,
      include: {
        user: { select: { id: true, name: true, mobile: true } },
      },
    });

    if (onlinePartners.length === 0) {
      const reason = isCOD && dedicatedAgentIds.length > 0
        ? 'No dedicated agents available for this COD order'
        : 'No online partners available';
      return errorResponse(reason, 404);
    }

    const partnerIds = onlinePartners.map(p => p.id);
    const partnerWallets = await prisma.partnerWallet.findMany({
      where: { partnerId: { in: partnerIds } },
    });
    const walletMap = {};
    partnerWallets.forEach(w => { walletMap[w.partnerId] = w; });

    const partnersWithDistance = onlinePartners
      .map(p => ({
        ...p,
        distance: haversineDistance(pickupLat, pickupLng, p.currentLat, p.currentLng),
      }))
      .filter(p => p.distance <= maxRange)
      .filter(p => {
        if (order.paymentMethod === 'COD') {
          const wallet = walletMap[p.id];
          const codPending = wallet?.codPending || 0;
          const orderAmount = order.totalAmount || 0;
          return (codPending + orderAmount) <= codMaxPending;
        }
        return true;
      })
      .sort((a, b) => a.distance - b.distance || b.rating - a.rating);

    if (partnersWithDistance.length === 0) {
      return errorResponse(`No partners within ${maxRange}km range${order.paymentMethod === 'COD' ? ' with available COD limit' : ''}`, 404);
    }

    const bestPartner = partnersWithDistance[0];

    const delivery = await prisma.delivery.create({
      data: {
        orderId,
        partnerId: bestPartner.id,
        status: 'ASSIGNED',
      },
      include: {
        order: {
          select: { id: true, totalAmount: true, deliveryFee: true, status: true },
        },
        partner: {
          select: {
            id: true,
            activeVehicle: {
              select: { vehicleType: true, vehicleNumber: true },
            },
            user: { select: { id: true, name: true, mobile: true } },
          },
        },
      },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'READY_FOR_PICKUP' },
    });

    if (isCOD && supplier?.pickupSlaHours > 0) {
      const pickupDeadline = new Date(Date.now() + supplier.pickupSlaHours * 60 * 60 * 1000);
      await prisma.orderSLA.upsert({
        where: { orderId },
        create: {
          orderId,
          supplierId: supplier.id,
          slaType: 'PICKUP',
          status: 'ACTIVE',
          deadline: pickupDeadline,
        },
        update: {
          slaType: 'PICKUP',
          status: 'ACTIVE',
          deadline: pickupDeadline,
          breachedAt: null,
        },
      });
      console.log(`⏱️ SLA 2 (Pickup) created: Order ${orderId.slice(0,8)} must be picked up by ${pickupDeadline.toISOString()}`);
    }

    const codMsg = isCOD && !codGlobalEnabled ? ' — Global COD OFF, assigned normally' : isCOD && dedicatedAgentIds.length > 0 ? ' — Dedicated agent' : '';
    return successResponse({
      message: `Auto-assigned to ${bestPartner.user?.name} (${bestPartner.distance?.toFixed(1)}km away)${codMsg}`,
      delivery,
    }, 201);
  } catch (error) {
    console.error('Auto-assign error:', error);
    return errorResponse('Auto-assignment failed', 500);
  }
}