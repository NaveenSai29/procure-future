import prisma from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/auth';
import { NotificationService } from '@/services/notification.service';

/**
 * POST - Reassign expired deliveries (partner didn't accept in 30s)
 * Called by cron job or when partner rejects
 */
export async function POST(request) {
  try {
    // Find all expired deliveries
    const expiredDeliveries = await prisma.delivery.findMany({
      where: {
        status: 'ASSIGNED',
        expiresAt: { lt: new Date() },
      },
      include: {
        order: {
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
        },
      },
    });

    for (const delivery of expiredDeliveries) {
      // Mark current as expired
      await prisma.delivery.update({
        where: { id: delivery.id },
        data: { status: 'EXPIRED' },
      });

      // Find NEXT nearest partner
      const order = delivery.order;
      const supplier = order.product?.supplier;
      const warehouse = supplier?.warehouses?.[0];
      const pickupLat = warehouse?.latitude || 12.9716;
      const pickupLng = warehouse?.longitude || 77.5946;

      const rangeSetting = await prisma.systemSetting.findFirst({
        where: { category: 'DELIVERY', key: 'autoAssignRange' },
      });
      const maxRange = rangeSetting ? parseFloat(rangeSetting.value) : 7;

      // Find other online partners (excluding the one who expired)
      const nextPartners = await prisma.deliveryPartner.findMany({
        where: {
          isOnline: true,
          isVerified: true,
          currentLat: { not: null },
          currentLng: { not: null },
          id: { not: delivery.partnerId }, // Exclude expired partner
        },
        include: {
          user: { select: { id: true, expoPushToken: true, name: true } },
        },
      });

      const nextPartner = nextPartners
        .map(p => ({
          ...p,
          distance: haversineDistance(pickupLat, pickupLng, p.currentLat, p.currentLng),
        }))
        .filter(p => p.distance <= maxRange)
        .sort((a, b) => a.distance - b.distance)[0];

      if (nextPartner) {
        // Assign to next partner with 30s window
        await prisma.delivery.create({
          data: {
            orderId: delivery.orderId,
            partnerId: nextPartner.id,
            status: 'ASSIGNED',
            assignedAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 1000),
          },
        });

        // Notify next partner
        if (nextPartner.user?.expoPushToken) {
          await NotificationService.send({
            userId: nextPartner.user.id,
            type: 'PUSH',
            title: '🛵 New Delivery Order!',
            message: `₹${order.totalAmount} — Accept now! (30s)`,
            eventType: 'new_order_broadcast',
            data: {
              deliveryId: null,
              orderId: order.id,
              type: 'NEW_ORDER_BROADCAST',
              amount: order.totalAmount,
            },
          });
        }
      } else {
        // No more partners — cancel the order or mark for manual assignment
        await prisma.order.update({
          where: { id: delivery.orderId },
          data: { status: 'PENDING_ASSIGNMENT' },
        });
      }
    }

    return successResponse({
      message: `Reassigned ${expiredDeliveries.length} expired deliveries`,
    });
  } catch (error) {
    console.error('Reassign expired error:', error);
    return errorResponse('Reassign failed', 500);
  }
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}