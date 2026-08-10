const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const stalls = await prisma.stall.findMany();
  console.log("Total Stalls:", stalls.length);
  
  const vacant = stalls.filter(s => s.status === 'VACANT');
  console.log("Vacant Stalls:", vacant.length);
  
  if (vacant.length > 0) {
    console.log("Sample Vacant Stall:", vacant[0]);
  }
  
  const occupied = stalls.filter(s => s.status === 'OCCUPIED');
  console.log("Occupied Stalls:", occupied.length);

  const statuses = [...new Set(stalls.map(s => s.status))];
  console.log("Available Statuses:", statuses);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
