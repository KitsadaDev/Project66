const { Client } = require('pg');

async function main() {
    // Using DIRECT_URL from .env manually to be sure
    const connectionString = "postgresql://postgres.snxkzyhyjndxufdswcks:0624216512yhnmju@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres";
    const client = new Client({
        connectionString: connectionString,
    });

    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('Manually adding columns...');
        await client.query(`
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
        await client.end();
    }
}

main();
