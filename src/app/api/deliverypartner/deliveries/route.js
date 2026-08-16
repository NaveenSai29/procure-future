import prisma from '@/lib/prisma';
import { getSessionUser, successResponse, errorResponse } from '@/lib/auth';

export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) {
      return errorResponse('Unauthorized', 401);
    }

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

    const partnerId = user.deliveryPartner.id;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');

    // Build where clause
    const where = { partnerId };
    if (status) {
      where.status = status;
    }

    // Get deliveries with order details
    const [deliveries, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
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
              deliveryAddress: true,
              deliveryLat: true,
              deliveryLng: true,
              buyer: {
                select: {
                  id: true,
                  name: true,
                  mobile: true,
                },
              },
              product: {
                select: {
                  id: true,
                  name: true,
                  supplier: {
                    select: {
                      id: true,
                      businessName: true,
                    },
                  },
                  warehouses: {
                    where: { isPickupLocation: true, isActive: true },
                    take: 1,
                    select: {
                      id: true,
                      name: true,
                      addressLine1: true,
                      addressLine2: true,
                      city: true,
                      state: true,
                      pincode: true,
                      latitude: true,
                      longitude: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.delivery.count({ where }),
    ]);

    // Calculate net delivery fee after commission and build pickup info
    const { CommissionService } = await import('@/services/commission.service');
    const deliveriesWithNet = await Promise.all(deliveries.map(async (d) => {
      const deliveryFee = d.order?.deliveryFee || 0;
      const { netEarning } = await CommissionService.calculateDeliveryNetEarning(deliveryFee);
      
      // Build pickup address from warehouse
      const pickupWarehouse = d.order?.product?.warehouses?.[0] || null;
      const pickupAddress = pickupWarehouse
        ? [
            pickupWarehouse.addressLine1,
            pickupWarehouse.addressLine2,
            pickupWarehouse.city,
            pickupWarehouse.state,
            pickupWarehouse.pincode,
          ].filter(Boolean).join(', ')
        : null;
      
      return {
        ...d,
        order: {
          ...d.order,
          netDeliveryFee: netEarning,
          pickupName: d.order?.product?.supplier?.businessName || pickupWarehouse?.name || null,
          pickupAddress: pickupAddress,
          pickupLat: pickupWarehouse?.latitude || null,
          pickupLng: pickupWarehouse?.longitude || null,
        },
      };
    }));

    return successResponse({
      deliveries: deliveriesWithNet,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get deliveries error:', error);
    return errorResponse('Failed to fetch deliveries', 500);
  }
}