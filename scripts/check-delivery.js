const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const settings = await p.systemSetting.findMany({ where: { category: 'DELIVERY' } });
  
  for (const s of settings) {
    try {
      const val = JSON.parse(s.value);
      console.log(`\n📦 ${s.key}:`);
      if (s.key === 'vehicles') {
        val.forEach((v, i) => {
          console.log(`  ${i+1}. ${v.type} - Max:${v.maxWeight}kg`);
          if (v.distanceSlabs) {
            v.distanceSlabs.forEach(sl => {
              console.log(`     ${sl.upToKm}km: Rs ${sl.perKmRate || sl.charge}/km`);
            });
          }
        });
      } else {
        console.log('  ', JSON.stringify(val).substring(0, 300));
      }
    } catch {
      console.log(`\n📦 ${s.key}: ${s.value.substring(0, 200)}`);
    }
  }
  
  await p.$disconnect();
}

main();