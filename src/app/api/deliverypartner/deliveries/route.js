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
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.delivery.count({ where }),
    ]);

    // Calculate net delivery fee after commission for each delivery
    const { CommissionService } = await import('@/services/commission.service');
    const deliveriesWithNet = await Promise.all(deliveries.map(async (d) => {
      const deliveryFee = d.order?.deliveryFee || 0;
      const { netEarning } = await CommissionService.calculateDeliveryNetEarning(deliveryFee);
      return {
        ...d,
        order: {
          ...d.order,
          netDeliveryFee: netEarning,
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