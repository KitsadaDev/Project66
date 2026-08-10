const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.foodCourt.createMany({
    data: [
      { name: 'ศูนย์อาหาร 1', total_slots: 50 },
      { name: 'ศูนย์อาหาร 2', total_slots: 50 },
    ],
    skipDuplicates: true
  });
  console.log('Seeded Food Courts');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
