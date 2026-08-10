const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
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
    let output = '';
    const log = (msg) => {
        console.log(msg);
        output += msg + '\n';
    };

    try {
        log('Manually adding columns via raw SQL with direct connection...');
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "MonthlyExpense" 
            ADD COLUMN IF NOT EXISTS "water_units" DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS "electricity_units" DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS "water_rate" DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS "electricity_rate" DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS "grease_trap_fee" DOUBLE PRECISION;
        `);
        log('Columns added successfully.');
        
        const count = await prisma.monthlyExpense.count();
        log('Total expenses in DB: ' + count);
    } catch (e) {
        log('Error: ' + e.message);
    } finally {
        fs.writeFileSync(path.join(__dirname, 'manual_sql_out.txt'), output);
        await prisma.$disconnect();
    }
}

main();
