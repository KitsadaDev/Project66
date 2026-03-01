const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log('Connecting...');
  await prisma.$connect();
  console.log('Connected.');
  const meters = await prisma.utilityMeter.findMany({
    take: 5,
    orderBy: { created_at: 'desc' }
  });
  console.log('Meters:', JSON.stringify(meters, null, 2));
}
main().catch(err => console.error('Error:', err)).finally(() => prisma.$disconnect());
