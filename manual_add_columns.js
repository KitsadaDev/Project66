const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Manually adding columns...');
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "MonthlyExpense" 
            ADD COLUMN IF NOT EXISTS "water_units" DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS "electricity_units" DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS "water_rate" DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS "electricity_rate" DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS "grease_trap_fee" DOUBLE PRECISION;
        `);
        console.log('Columns added successfully.');
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
