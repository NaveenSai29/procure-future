import prisma from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/auth';

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// POST - Auto-assign delivery partner when order is READY_FOR_PICKUP
export async function POST(request) {
  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) return errorResponse('orderId required', 400);

    // Get order with warehouse/supplier location
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
              },
            },
          },
        },
      },
    });

    if (!order) return errorResponse('Order not found', 404);

    // Check if already assigned
    const existingDelivery = await prisma.delivery.findUnique({ where: { orderId } });
    if (existingDelivery) return errorResponse('Delivery already assigned', 400);

    // Get auto-assign range from settings (default 7km)
    const rangeSetting = await prisma.systemSetting.findFirst({
      where: { category: 'DELIVERY', key: 'autoAssignRange' },
    });
    const maxRange = rangeSetting ? parseFloat(rangeSetting.value) : 7;

    // Get COD limit from settings (default ₹5000)
    const codMaxPendingSetting = await prisma.systemSetting.findFirst({
      where: { category: 'DELIVERY', key: 'codMaxPending' },
    });
    const codMaxPending = codMaxPendingSetting ? parseFloat(codMaxPendingSetting.value) : 5000;

    // Get supplier warehouse coordinates
    const warehouse = order.product?.supplier?.warehouses?.[0];
    const pickupLat = warehouse?.latitude || 12.9716;
    const pickupLng = warehouse?.longitude || 77.5946;

    // Find online verified partners
    const onlinePartners = await prisma.deliveryPartner.findMany({
      where: {
        isOnline: true,
        isVerified: true,
        currentLat: { not: null },
        currentLng: { not: null },
      },
      include: {
        user: { select: { id: true, name: true, mobile: true } },
      },
    });

    if (onlinePartners.length === 0) {
      return errorResponse('No online partners available', 404);
    }

    // Get all partner wallets for COD limit check
    const partnerIds = onlinePartners.map(p => p.id);
    const partnerWallets = await prisma.partnerWallet.findMany({
      where: { partnerId: { in: partnerIds } },
    });
    const walletMap = {};
    partnerWallets.forEach(w => { walletMap[w.partnerId] = w; });

    // Calculate distance for each partner, filter by range, filter by COD limit, sort by closest
    const partnersWithDistance = onlinePartners
      .map(p => ({
        ...p,
        distance: haversineDistance(pickupLat, pickupLng, p.currentLat, p.currentLng),
      }))
      .filter(p => p.distance <= maxRange)
      .filter(p => {
        // If order is COD, check partner's COD limit
        if (order.paymentMethod === 'COD') {
          const wallet = walletMap[p.id];
          const codPending = wallet?.codPending || 0;
          const orderAmount = order.totalAmount || 0;
          // Partner can take this order only if pending + new order ≤ limit
          return (codPending + orderAmount) <= codMaxPending;
        }
        // Non-COD orders: no limit check needed
        return true;
      })
      .sort((a, b) => a.distance - b.distance || b.rating - a.rating);

    if (partnersWithDistance.length === 0) {
      return errorResponse(`No partners within ${maxRange}km range${order.paymentMethod === 'COD' ? ' with available COD limit' : ''}`, 404);
    }

    // Assign to best partner (closest + highest rated + within COD limit)
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

    return successResponse({
      message: `Auto-assigned to ${bestPartner.user?.name} (${bestPartner.distance?.toFixed(1)}km away)`,
      delivery,
    }, 201);
  } catch (error) {
    console.error('Auto-assign error:', error);
    return errorResponse('Auto-assignment failed', 500);
  }
}