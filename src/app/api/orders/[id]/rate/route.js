import prisma from '@/lib/prisma';
import { getSessionUser, successResponse, errorResponse } from '@/lib/auth';

export async function POST(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) return errorResponse('Unauthorized', 401);

    const { id } = await params;
    const { rating } = await request.json();

    if (!rating || rating < 1 || rating > 5) return errorResponse('Rating must be 1-5', 400);

    // Find the delivery for this order
    const delivery = await prisma.delivery.findUnique({
      where: { orderId: id },
    });

    if (!delivery?.partnerId) return errorResponse('No delivery partner found', 404);

    // Update partner rating (average)
    const partner = await prisma.deliveryPartner.findUnique({
      where: { id: delivery.partnerId },
      select: { rating: true, totalDeliveries: true },
    });

    if (partner) {
      const currentRating = partner.rating || 0;
      const currentDeliveries = partner.totalDeliveries || 0;
      
      // totalDeliveries was already incremented when order was marked DELIVERED
      // So previous ratings count = currentDeliveries - 1
      const previousRatedCount = Math.max(0, currentDeliveries - 1);
      const currentSum = currentRating * previousRatedCount;
      const newRating = (currentSum + rating) / (previousRatedCount + 1);

      await prisma.deliveryPartner.update({
        where: { id: delivery.partnerId },
        data: { rating: Math.round(newRating * 10) / 10 },
      });
    }

    return successResponse({ message: 'Rating submitted' });
  } catch (error) {
    console.error('Rating error:', error);
    return errorResponse('Failed to save rating', 500);
  }
}