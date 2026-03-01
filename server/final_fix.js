const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
    let output = '';
    try {
        console.log('Adding columns...');
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "MonthlyExpense" 
            ADD COLUMN IF NOT EXISTS "water_units" DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS "electricity_units" DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS "water_rate" DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS "electricity_rate" DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS "grease_trap_fee" DOUBLE PRECISION;
        `);
        output = 'SUCCESS';
    } catch (e) {
        output = 'ERROR: ' + e.message;
    } finally {
        fs.writeFileSync('../db_fix_final.txt', output);
        await prisma.$disconnect();
    }
}

main();
