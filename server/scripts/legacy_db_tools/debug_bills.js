const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Utility Meters ---');
  const meters = await prisma.utilityMeter.findMany({
    take: 10,
    orderBy: { created_at: 'desc' },
    include: { slot: true }
  });
  console.dir(meters, { depth: null });

  console.log('\n--- Monthly Expenses ---');
  const expenses = await prisma.monthlyExpense.findMany({
    take: 5,
    orderBy: { created_at: 'desc' },
    include: { contract: { include: { slot: true } } }
  });
  console.dir(expenses, { depth: null });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
