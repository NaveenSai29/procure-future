const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function fix() {
  const users = await p.user.findMany({
    select: { id: true, mobile: true, deliveryPartner: true }
  });
  
  const missing = users.filter(u => !u.deliveryPartner);
  
  if (missing.length === 0) {
    console.log('All users have delivery partner');
    await p.$disconnect();
    return;
  }
  
  for (const user of missing) {
    await p.deliveryPartner.create({ data: { userId: user.id } });
    console.log('Created for', user.mobile);
  }
  
  console.log('Done!');
  await p.$disconnect();
}

fix();