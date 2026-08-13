import prisma from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/auth';
import { NotificationService } from '@/services/notification.service';

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/**
 * POST - Broadcast new order to ALL eligible online partners within range
 * First partner to ACCEPT gets the order
 */
export async function POST(request) {
  try {
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
                dedicatedAgents: true,
                warehouses: true,
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
    const warehouse = supplier?.warehouses?.[0];

    const rangeSetting = await prisma.systemSetting.findFirst({
      where: { category: 'DELIVERY', key: 'autoAssignRange' },
    });
    const maxRange = rangeSetting ? parseFloat(rangeSetting.value) : 7;

    const codGlobalSetting = await prisma.systemSetting.findFirst({
      where: { category: 'DELIVERY', key: 'codGlobalEnabled' },
    });
    const codGlobalEnabled = codGlobalSetting ? codGlobalSetting.value !== 'false' : true;

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
        user: { select: { id: true, name: true, expoPushToken: true, mobile: true } },
      },
    });

    if (onlinePartners.length === 0) {
      return errorResponse('No online partners available', 404);
    }

    // Filter by COD limit for COD orders
    const partnerIds = onlinePartners.map(p => p.id);
    const partnerWallets = await prisma.partnerWallet.findMany({
      where: { partnerId: { in: partnerIds } },
    });
    const walletMap = {};
    partnerWallets.forEach(w => { walletMap[w.partnerId] = w; });

    const codMaxPendingSetting = await prisma.systemSetting.findFirst({
      where: { category: 'DELIVERY', key: 'codMaxPending' },
    });
    const codMaxPending = codMaxPendingSetting ? parseFloat(codMaxPendingSetting.value) : 5000;

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
          return (codPending + order.totalAmount) <= codMaxPending;
        }
        return true;
      });

    if (partnersWithDistance.length === 0) {
      return errorResponse(`No partners within ${maxRange}km range`, 404);
    }

    // Broadcast to ALL eligible partners
    const notifiedPartners = [];
    
    for (const partner of partnersWithDistance) {
      if (partner.user?.expoPushToken) {
        try {
          await NotificationService.send({
            userId: partner.user.id,
            type: 'PUSH',
            title: '🛵 New Delivery Order!',
            message: `₹${order.totalAmount} — ${partner.distance.toFixed(1)}km away. Accept now!`,
            eventType: 'new_order_broadcast',
            data: {
              orderId: order.id,
              type: 'NEW_ORDER_BROADCAST',
              amount: order.totalAmount,
              distance: partner.distance,
            },
          });
          notifiedPartners.push(partner.id);
        } catch (err) {
          console.log(`Failed to notify partner ${partner.id}:`, err.message);
        }
      }
    }

    return successResponse({
      message: `Broadcast sent to ${notifiedPartners.length} partners within ${maxRange}km`,
      notifiedPartners,
      totalEligible: partnersWithDistance.length,
    });
  } catch (error) {
    console.error('Broadcast error:', error);
    return errorResponse('Broadcast failed', 500);
  }
}