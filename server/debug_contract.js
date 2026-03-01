const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const contracts = await prisma.rentalContract.findMany({
    include: {
      tenant: true,
      slot: true
    }
  });
  console.log('Contracts:', JSON.stringify(contracts, null, 2));
  
  const tenants = await prisma.user.findMany({
    where: { role: 'TENANT' }
  });
  console.log('Tenants:', JSON.stringify(tenants, null, 2));
}

main().catch(console.error).finally(() => process.exit(0));
