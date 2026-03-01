const { PrismaClient } = require('@prisma/client');
const path = require('path');

// Direct URL from .env
const directUrl = "postgresql://postgres.snxkzyhyjndxufdswcks:0624216512yhnmju@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres";

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: directUrl
        }
    }
});

async function main() {
    try {
        console.log('Manually adding columns via raw SQL with direct connection...');
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "MonthlyExpense" 
            ADD COLUMN IF NOT EXISTS "water_units" DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS "electricity_units" DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS "water_rate" DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS "electricity_rate" DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS "grease_trap_fee" DOUBLE PRECISION;
        `);
        console.log('Columns added successfully.');
        
        // Check if data exists
        const count = await prisma.monthlyExpense.count();
        console.log('Total expenses in DB:', count);
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
