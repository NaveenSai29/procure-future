const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Remove old distanceSlabs and peakMultiplier (now inside vehicles)
  await p.systemSetting.deleteMany({
    where: {
      category: 'DELIVERY',
      key: { in: ['distanceSlabs', 'peakMultiplier'] }
    }
  });
  console.log('✅ Old distanceSlabs and peakMultiplier removed');
  
  // Verify current settings
  const settings = await p.systemSetting.findMany({ where: { category: 'DELIVERY' } });
  console.log(`\nCurrent DELIVERY keys: ${settings.map(s => s.key).join(', ')}`);
  
  await p.$disconnect();
}

main();