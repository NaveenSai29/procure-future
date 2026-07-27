import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const user = await prisma.user.findUnique({
  where: { email: 'admin@procure.com' },
  include: { roles: { include: { role: true } } },
});

console.log('User:', user?.name);
console.log('Roles:', user?.roles?.map(r => r.role.name));
await prisma.$disconnect();