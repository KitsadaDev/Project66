const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Checking Users ---');
  const users = await prisma.user.findMany({
    select: { id: true, name: true, role: true }
  });
  console.table(users);
  
  console.log('\n--- Checking Maintenance Requests ---');
  const requests = await prisma.maintenanceRequest.findMany({
    select: { id: true, title: true, status: true, assignedToId: true }
  });
  console.table(requests);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
