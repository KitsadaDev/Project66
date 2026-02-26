const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const courts = await prisma.foodCourt.findMany();
  console.log('Food Courts in DB:', courts);
  process.exit(0);
}

check().catch(e => {
  console.error(e);
  process.exit(1);
});
