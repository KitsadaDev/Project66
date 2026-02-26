const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.foodCourt.findMany().then(res => console.log('FOOD COURTS:', JSON.stringify(res))).catch(console.error).finally(() => process.exit(0));
