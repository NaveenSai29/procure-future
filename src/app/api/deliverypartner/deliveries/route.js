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
    const status = searchParams.get('status'); // Optional filter: ASSIGNED, PICKED_UP, IN_TRANSIT, DELIVERED
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

    return successResponse({
      deliveries,
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