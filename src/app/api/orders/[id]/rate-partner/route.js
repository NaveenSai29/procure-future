import prisma from '@/lib/prisma';
import { getSessionUser, successResponse, errorResponse } from '@/lib/auth';

export async function POST(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse('Unauthorized', 401);

    const { id } = await params;
    const { rating } = await request.json();

    if (!rating || rating < 1 || rating > 5) return errorResponse('Rating must be 1-5', 400);

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        buyerId: true,
        status: true,
        delivery: { select: { partnerId: true } },
      },
    });

    if (!order) return errorResponse('Order not found', 404);
    if (order.buyerId !== session.userId) return errorResponse('You can only rate your own orders', 403);
    if (order.status !== 'DELIVERED') return errorResponse('Can only rate delivered orders', 400);

    // Update order partner rating
    await prisma.order.update({
      where: { id },
      data: { partnerRating: rating, partnerRatedAt: new Date() },
    });

    // Update partner rating
    const partnerId = order.delivery?.partnerId;
    if (partnerId) {
      const partner = await prisma.deliveryPartner.findUnique({
        where: { id: partnerId },
        select: { rating: true, totalDeliveries: true },
      });

      if (partner) {
        const currentRating = partner.rating || 0;
        const currentDeliveries = partner.totalDeliveries || 0;
        const previousRatedCount = Math.max(0, currentDeliveries - 1);
        const currentSum = currentRating * previousRatedCount;
        const newRating = (currentSum + rating) / (previousRatedCount + 1);
        await prisma.deliveryPartner.update({
          where: { id: partnerId },
          data: { rating: Math.round(newRating * 10) / 10 },
        });
      }
    }

    return successResponse({ message: 'Partner rated successfully' });
  } catch (error) {
    console.error('Partner rating error:', error);
    return errorResponse('Failed to rate partner', 500);
  }
}