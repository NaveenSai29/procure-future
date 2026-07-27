import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function approve() {
  await prisma.product.updateMany({
    data: { isActive: true, isApproved: true },
  });
  console.log('All products approved');
  await prisma.$disconnect();
}

approve();