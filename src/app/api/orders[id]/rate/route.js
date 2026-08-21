import prisma from '@/lib/prisma';
import { getSessionUser, successResponse, errorResponse } from '@/lib/auth';

export async function POST(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse('Unauthorized', 401);

    const { id } = await params;
    const { rating, comment } = await request.json();

    if (!rating || rating < 1 || rating > 5) return errorResponse('Rating must be 1-5', 400);

    // Find the order
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        buyerId: true,
        status: true,
        rating: true,
        product: {
          select: {
            supplierId: true,
          },
        },
      },
    });

    if (!order) return errorResponse('Order not found', 404);

    if (order.buyerId !== session.userId) return errorResponse('You can only rate your own orders', 403);

    if (order.status !== 'DELIVERED') return errorResponse('Can only rate delivered orders', 400);

    // Update order rating
    await prisma.order.update({
      where: { id },
      data: {
        rating,
        ratingComment: comment || null,
        ratedAt: new Date(),
      },
    });

    // Update supplier rating
    const supplierId = order.product?.supplierId;
    if (supplierId) {
      const supplier = await prisma.supplier.findUnique({
        where: { id: supplierId },
        select: { avgRating: true, ratingCount: true },
      });

      if (supplier) {
        const newCount = supplier.ratingCount + 1;
        const newAvg = ((supplier.avgRating * supplier.ratingCount) + rating) / newCount;

        await prisma.supplier.update({
          where: { id: supplierId },
          data: {
            avgRating: Math.round(newAvg * 10) / 10,
            ratingCount: newCount,
          },
        });
      }
    }

    // Update delivery partner rating
    const delivery = await prisma.delivery.findUnique({
      where: { orderId: id },
    });

    if (delivery?.partnerId) {
      const partner = await prisma.deliveryPartner.findUnique({
        where: { id: delivery.partnerId },
        select: { rating: true, totalDeliveries: true },
      });

      if (partner) {
        const currentRating = partner.rating || 0;
        const currentDeliveries = partner.totalDeliveries || 0;
        const previousRatedCount = Math.max(0, currentDeliveries - 1);
        const currentSum = currentRating * previousRatedCount;
        const newRating = (currentSum + rating) / (previousRatedCount + 1);

        await prisma.deliveryPartner.update({
          where: { id: delivery.partnerId },
          data: { rating: Math.round(newRating * 10) / 10 },
        });
      }
    }

    return successResponse({ message: 'Rating submitted' });
  } catch (error) {
    console.error('Rating error:', error);
    return errorResponse('Failed to save rating', 500);
  }
}