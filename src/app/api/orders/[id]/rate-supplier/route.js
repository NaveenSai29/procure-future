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
        product: { select: { supplierId: true } },
      },
    });

    if (!order) return errorResponse('Order not found', 404);
    if (order.buyerId !== session.userId) return errorResponse('You can only rate your own orders', 403);
    if (order.status !== 'DELIVERED') return errorResponse('Can only rate delivered orders', 400);

    // Update order supplier rating
    await prisma.order.update({
      where: { id },
      data: { supplierRating: rating, supplierRatedAt: new Date() },
    });

    // Update supplier avg rating
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

    return successResponse({ message: 'Supplier rated successfully' });
  } catch (error) {
    console.error('Supplier rating error:', error);
    return errorResponse('Failed to rate supplier', 500);
  }
}