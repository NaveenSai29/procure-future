const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚛 Seeding delivery settings...\n');

  const deliverySettings = {
    vehicles: [
      { type: 'Bike', maxWeight: 10, distanceSlabs: [
        { upToKm: 5, perKmRate: 25 }, { upToKm: 10, perKmRate: 35 }, { upToKm: 20, perKmRate: 50 }, { upToKm: 999, perKmRate: 70 }
      ]},
      { type: 'Scooter', maxWeight: 20, distanceSlabs: [
        { upToKm: 5, perKmRate: 30 }, { upToKm: 10, perKmRate: 40 }, { upToKm: 20, perKmRate: 55 }, { upToKm: 999, perKmRate: 75 }
      ]},
      { type: 'Auto', maxWeight: 50, distanceSlabs: [
        { upToKm: 5, perKmRate: 35 }, { upToKm: 10, perKmRate: 50 }, { upToKm: 20, perKmRate: 65 }, { upToKm: 999, perKmRate: 85 }
      ]},
      { type: 'Mini Truck', maxWeight: 500, distanceSlabs: [
        { upToKm: 5, perKmRate: 50 }, { upToKm: 10, perKmRate: 65 }, { upToKm: 20, perKmRate: 85 }, { upToKm: 999, perKmRate: 110 }
      ]},
      { type: 'Tata Ace', maxWeight: 1000, distanceSlabs: [
        { upToKm: 5, perKmRate: 60 }, { upToKm: 10, perKmRate: 75 }, { upToKm: 20, perKmRate: 100 }, { upToKm: 999, perKmRate: 130 }
      ]},
      { type: 'Pickup Truck', maxWeight: 2000, distanceSlabs: [
        { upToKm: 5, perKmRate: 70 }, { upToKm: 10, perKmRate: 90 }, { upToKm: 20, perKmRate: 120 }, { upToKm: 999, perKmRate: 150 }
      ]},
      { type: 'Tempo', maxWeight: 3500, distanceSlabs: [
        { upToKm: 5, perKmRate: 80 }, { upToKm: 10, perKmRate: 105 }, { upToKm: 20, perKmRate: 140 }, { upToKm: 999, perKmRate: 180 }
      ]},
      { type: 'LCV', maxWeight: 5000, distanceSlabs: [
        { upToKm: 5, perKmRate: 100 }, { upToKm: 10, perKmRate: 130 }, { upToKm: 20, perKmRate: 170 }, { upToKm: 999, perKmRate: 220 }
      ]},
      { type: 'Container', maxWeight: 20000, distanceSlabs: [
        { upToKm: 5, perKmRate: 150 }, { upToKm: 10, perKmRate: 200 }, { upToKm: 20, perKmRate: 260 }, { upToKm: 999, perKmRate: 350 }
      ]},
      { type: 'Truck', maxWeight: 40000, distanceSlabs: [
        { upToKm: 5, perKmRate: 200 }, { upToKm: 10, perKmRate: 260 }, { upToKm: 20, perKmRate: 340 }, { upToKm: 999, perKmRate: 450 }
      ]},
    ],
    freeWeightUpTo: 5,
    weightChargePerKg: 3,
    maxWeight: 40000,
    freeDeliveryAbove: 4999,
    maxDistance: 200,
    platformFee: 5,
    gstPercent: 5,
    codCharge: 30,
    expressMultiplier: 1.8,
    sameDayMultiplier: 2.0,
    minDeliveryFee: 20,
    surgeEnabled: false,
    rainSurgeMultiplier: 1.5,
    autoWeatherEnabled: true,
    peakHours: [
      { start: '18:00', end: '22:00', multiplier: 1.4, label: 'Evening Peak' },
      { start: '08:00', end: '10:00', multiplier: 1.2, label: 'Morning Rush' },
    ],
  };

  for (const [key, value] of Object.entries(deliverySettings)) {
    await prisma.systemSetting.upsert({
      where: { category_key: { category: 'DELIVERY', key } },
      create: { category: 'DELIVERY', key, value: JSON.stringify(value), description: `Delivery setting: ${key}` },
      update: { value: JSON.stringify(value) },
    });
    console.log(`  ✅ DELIVERY.${key}`);
  }

  console.log('\n✅ All delivery settings seeded!');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());