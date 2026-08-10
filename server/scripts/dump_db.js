const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
  const courts = await prisma.foodCourt.findMany();
  fs.writeFileSync('courts.json', JSON.stringify(courts, null, 2));
}

main().catch(console.error).finally(() => process.exit(0));
