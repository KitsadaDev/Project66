const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');
  
  // Create Food Court 1
  const fc1 = await prisma.foodCourt.upsert({
    where: { food_court_id: 1 },
    update: {},
    create: {
      food_court_id: 1,
      name: 'ศูนย์อาหาร 1',
      total_slots: 50,
    },
  });
  console.log('Upserted Food Court 1', fc1);

  // Create Food Court 2
  const fc2 = await prisma.foodCourt.upsert({
    where: { food_court_id: 2 },
    update: {},
    create: {
      food_court_id: 2,
      name: 'ศูนย์อาหาร 2',
      total_slots: 50,
    },
  });
  console.log('Upserted Food Court 2', fc2);
  
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error('Seeding Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
