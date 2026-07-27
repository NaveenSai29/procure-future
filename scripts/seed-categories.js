import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seed() {
  const cats = [
    { name: 'Electronics', slug: 'electronics' },
    { name: 'Office Supplies', slug: 'office-supplies' },
    { name: 'Construction Materials', slug: 'construction-materials' },
    { name: 'Electrical', slug: 'electrical' },
    { name: 'Hardware', slug: 'hardware' },
    { name: 'Industrial Tools', slug: 'industrial-tools' },
    { name: 'Safety Equipment', slug: 'safety-equipment' },
    { name: 'Medical Supplies', slug: 'medical-supplies' },
    { name: 'Automobile Parts', slug: 'automobile-parts' },
    { name: 'Agriculture', slug: 'agriculture' },
  ];
  
  for (const c of cats) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    });
  }
  
  console.log('Categories seeded');
  await prisma.$disconnect();
}

seed();