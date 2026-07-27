import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const history = await prisma.orderStatusHistory.findMany({
  orderBy: { createdAt: 'desc' },
  take: 10,
});

console.log(JSON.stringify(history, null, 2));

await prisma.$disconnect();