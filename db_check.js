const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.utilityMeter.count();
  console.log('Total utility readings:', count);
  const latest = await prisma.utilityMeter.findFirst({ orderBy: { created_at: 'desc' } });
  console.log('Latest reading:', latest);
}
main().catch(console.error).finally(() => prisma.$disconnect());
