const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const existing1 = await prisma.foodCourt.findUnique({ where: { food_court_id: 1 } });
  if (!existing1) {
    await prisma.foodCourt.create({ data: { food_court_id: 1, name: 'ศูนย์อาหาร 1', total_slots: 50 } });
    console.log('Created Food Court 1');
  }
  
  const existing2 = await prisma.foodCourt.findUnique({ where: { food_court_id: 2 } });
  if (!existing2) {
    await prisma.foodCourt.create({ data: { food_court_id: 2, name: 'ศูนย์อาหาร 2', total_slots: 50 } });
    console.log('Created Food Court 2');
  }
  
  const all = await prisma.foodCourt.findMany();
  console.log('All Food Courts:', all);
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
