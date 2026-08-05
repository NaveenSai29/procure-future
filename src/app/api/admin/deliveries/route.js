import prisma from '@/lib/prisma';
import { getSessionUser, successResponse, errorResponse } from '@/lib/auth';

export async function GET(request) {
  try {
    const session = await getSessionUser();
    if (!session?.userId) {
      return errorResponse('Unauthorized', 401);
    }

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
    const date = searchParams.get('date');
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');

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
              rating: true,
              currentLat: true,
              currentLng: true,
              activeVehicle: {
                select: { vehicleType: true, vehicleNumber: true },
              },
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

    const existingDelivery = await prisma.delivery.findUnique({
      where: { orderId },
    });

    if (existingDelivery) {
      return errorResponse('Order already has a delivery assigned', 400);
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return errorResponse('Order not found', 404);
    }

    const partner = await prisma.deliveryPartner.findUnique({
      where: { id: partnerId },
      include: { activeVehicle: { select: { vehicleType: true } }, user: { select: { name: true } } },
    });

    if (!partner) {
      return errorResponse('Delivery partner not found', 404);
    }

    if (!partner.isVerified) {
      return errorResponse('Delivery partner is not verified', 400);
    }

    // COD limit check for manual assignment
    if (order.paymentMethod === 'COD') {
      const codMaxPendingSetting = await prisma.systemSetting.findFirst({
        where: { category: 'DELIVERY', key: 'codMaxPending' },
      });
      const codMaxPending = codMaxPendingSetting ? parseFloat(codMaxPendingSetting.value) : 5000;

      const wallet = await prisma.partnerWallet.findUnique({ where: { partnerId } });
      const codPending = wallet?.codPending || 0;
      const orderAmount = order.totalAmount || 0;

      if ((codPending + orderAmount) > codMaxPending) {
        return errorResponse(
          `Partner's COD limit reached. Pending: ₹${codPending}, This order: ₹${orderAmount}, Limit: ₹${codMaxPending}. Partner needs to deposit first.`,
          400
        );
      }
    }

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
            activeVehicle: {
              select: { vehicleType: true, vehicleNumber: true },
            },
            user: {
              select: { id: true, name: true, mobile: true },
            },
          },
        },
      },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'READY_FOR_PICKUP' },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: 'READY_FOR_PICKUP',
        changedBy: session.userId,
        notes: `Delivery assigned to ${partner.user?.name || partner.activeVehicle?.vehicleType || 'Partner'}`,
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