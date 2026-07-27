import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seed() {
  const order = await prisma.order.findFirst({ include: { product: true } });
  const supplier = await prisma.supplier.findFirst();

  if (order && supplier) {
    await prisma.returnRequest.create({
      data: {
        orderId: order.id,
        buyerId: order.buyerId,
        supplierId: supplier.id,
        reason: 'Product damaged during shipping',
        description: 'The box was crushed and the product has visible scratches',
        returnType: 'REFUND',
        refundAmount: order.totalAmount,
      },
    });
    console.log('Test return created!');
  } else {
    console.log('No order or supplier found. Create an order first.');
  }

  await prisma.$disconnect();
}

seed();