import prisma from '@/lib/prisma';
import { getSessionUser, successResponse, errorResponse } from '@/lib/auth';

export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) {
      return errorResponse('Unauthorized', 401);
    }

    // Verify admin role
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    const isAdmin = user?.roles?.some(r => r.role.name === 'ADMIN' || r.role.name === 'SUPER_ADMIN');
    if (!isAdmin) {
      return errorResponse('Forbidden: Admin access required', 403);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const partnerId = searchParams.get('partnerId');
    const date = searchParams.get('date'); // YYYY-MM-DD
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');

    // Build where clause
    const where = {};
    if (status) where.status = status;
    if (partnerId) where.partnerId = partnerId;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      where.createdAt = { gte: startDate, lt: endDate };
    }

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
              buyer: {
                select: { id: true, name: true, mobile: true },
              },
            },
          },
          partner: {
            select: {
              id: true,
              vehicleType: true,
              vehicleNumber: true,
              rating: true,
              currentLat: true,
              currentLng: true,
              user: {
                select: { id: true, name: true, mobile: true },
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
    console.error('Admin get deliveries error:', error);
    return errorResponse('Failed to fetch deliveries', 500);
  }
}

export async function POST(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) {
      return errorResponse('Unauthorized', 401);
    }

    // Verify admin role
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    const isAdmin = user?.roles?.some(r => r.role.name === 'ADMIN' || r.role.name === 'SUPER_ADMIN');
    if (!isAdmin) {
      return errorResponse('Forbidden: Admin access required', 403);
    }

    const body = await request.json();
    const { orderId, partnerId } = body;

    if (!orderId || !partnerId) {
      return errorResponse('orderId and partnerId are required', 400);
    }

    // Check if order exists and not already assigned
    const existingDelivery = await prisma.delivery.findUnique({
      where: { orderId },
    });

    if (existingDelivery) {
      return errorResponse('Order already has a delivery assigned', 400);
    }

    // Check if order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return errorResponse('Order not found', 404);
    }

    // Check if partner exists and is verified
    const partner = await prisma.deliveryPartner.findUnique({
      where: { id: partnerId },
    });

    if (!partner) {
      return errorResponse('Delivery partner not found', 404);
    }

    if (!partner.isVerified) {
      return errorResponse('Delivery partner is not verified', 400);
    }

    // Create delivery assignment
    const delivery = await prisma.delivery.create({
      data: {
        orderId,
        partnerId,
        status: 'ASSIGNED',
      },
      include: {
        order: {
          select: {
            id: true,
            totalAmount: true,
            deliveryFee: true,
            status: true,
          },
        },
        partner: {
          select: {
            id: true,
            vehicleType: true,
            vehicleNumber: true,
            user: {
              select: { id: true, name: true, mobile: true },
            },
          },
        },
      },
    });

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'READY_FOR_PICKUP' },
    });

    // Create order status history
    await prisma.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: 'READY_FOR_PICKUP',
        changedBy: session.userId,
        notes: `Delivery assigned to ${partner.user?.name || partner.vehicleType}`,
      },
    });

    return successResponse({
      message: 'Delivery assigned successfully',
      delivery,
    }, 201);
  } catch (error) {
    console.error('Admin assign delivery error:', error);
    return errorResponse('Failed to assign delivery', 500);
  }
}