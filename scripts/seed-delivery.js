const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚛 Seeding delivery settings...\n');

  const deliverySettings = {
    // Each vehicle has its own distance pricing strategy
    vehicles: [
      {
        type: 'Bike',
        baseCharge: 25,
        maxWeight: 10,
        useSlabPricing: true,
        distanceSlabs: [
          { upToKm: 5, charge: 25 },
          { upToKm: 10, charge: 50 },
          { upToKm: 20, charge: 90 },
          { upToKm: 50, charge: 180 },
          { upToKm: 999, charge: 300 },
        ],
        perKmRate: 8,
      },
      {
        type: 'Scooter',
        baseCharge: 35,
        maxWeight: 20,
        useSlabPricing: true,
        distanceSlabs: [
          { upToKm: 5, charge: 35 },
          { upToKm: 10, charge: 65 },
          { upToKm: 20, charge: 120 },
          { upToKm: 50, charge: 220 },
          { upToKm: 999, charge: 400 },
        ],
        perKmRate: 10,
      },
      {
        type: 'Auto',
        baseCharge: 49,
        maxWeight: 50,
        useSlabPricing: true,
        distanceSlabs: [
          { upToKm: 5, charge: 49 },
          { upToKm: 10, charge: 90 },
          { upToKm: 20, charge: 160 },
          { upToKm: 50, charge: 300 },
          { upToKm: 999, charge: 500 },
        ],
        perKmRate: 15,
      },
      {
        type: 'Mini Truck',
        baseCharge: 99,
        maxWeight: 500,
        useSlabPricing: true,
        distanceSlabs: [
          { upToKm: 5, charge: 99 },
          { upToKm: 10, charge: 180 },
          { upToKm: 20, charge: 320 },
          { upToKm: 50, charge: 600 },
          { upToKm: 999, charge: 900 },
        ],
        perKmRate: 22,
      },
      {
        type: 'Tata Ace',
        baseCharge: 149,
        maxWeight: 1000,
        useSlabPricing: true,
        distanceSlabs: [
          { upToKm: 5, charge: 149 },
          { upToKm: 10, charge: 260 },
          { upToKm: 20, charge: 450 },
          { upToKm: 50, charge: 800 },
          { upToKm: 999, charge: 1200 },
        ],
        perKmRate: 25,
      },
      {
        type: 'Pickup Truck',
        baseCharge: 199,
        maxWeight: 2000,
        useSlabPricing: true,
        distanceSlabs: [
          { upToKm: 5, charge: 199 },
          { upToKm: 10, charge: 350 },
          { upToKm: 20, charge: 600 },
          { upToKm: 50, charge: 1000 },
          { upToKm: 999, charge: 1500 },
        ],
        perKmRate: 30,
      },
      {
        type: 'Tempo',
        baseCharge: 249,
        maxWeight: 3500,
        useSlabPricing: true,
        distanceSlabs: [
          { upToKm: 5, charge: 249 },
          { upToKm: 10, charge: 430 },
          { upToKm: 20, charge: 750 },
          { upToKm: 50, charge: 1200 },
          { upToKm: 999, charge: 1800 },
        ],
        perKmRate: 35,
      },
      {
        type: 'LCV',
        baseCharge: 349,
        maxWeight: 5000,
        useSlabPricing: true,
        distanceSlabs: [
          { upToKm: 5, charge: 349 },
          { upToKm: 10, charge: 600 },
          { upToKm: 20, charge: 1000 },
          { upToKm: 50, charge: 1600 },
          { upToKm: 999, charge: 2400 },
        ],
        perKmRate: 40,
      },
      {
        type: 'Container',
        baseCharge: 599,
        maxWeight: 20000,
        useSlabPricing: true,
        distanceSlabs: [
          { upToKm: 5, charge: 599 },
          { upToKm: 10, charge: 1000 },
          { upToKm: 20, charge: 1800 },
          { upToKm: 50, charge: 3000 },
          { upToKm: 999, charge: 5000 },
        ],
        perKmRate: 55,
      },
      {
        type: 'Truck',
        baseCharge: 999,
        maxWeight: 40000,
        useSlabPricing: true,
        distanceSlabs: [
          { upToKm: 5, charge: 999 },
          { upToKm: 10, charge: 1700 },
          { upToKm: 20, charge: 3000 },
          { upToKm: 50, charge: 5000 },
          { upToKm: 999, charge: 8000 },
        ],
        perKmRate: 65,
      },
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
      create: {
        category: 'DELIVERY',
        key,
        value: JSON.stringify(value),
        description: `Delivery setting: ${key}`,
      },
      update: { value: JSON.stringify(value) },
    });
    console.log(`  ✅ DELIVERY.${key}`);
  }

  console.log('\n✅ All delivery settings seeded!');
  console.log('   Admin → Settings → Delivery to manage.\n');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());