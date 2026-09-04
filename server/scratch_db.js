const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.systemSetting.findMany().then(res => console.log(JSON.stringify(res, null, 2))).catch(console.error).finally(() => p.$disconnect());
