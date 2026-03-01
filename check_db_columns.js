const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const columns = await prisma.$queryRaw`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'MonthlyExpense'
        `;
        console.log('--- COLUMNS IN MonthlyExpense ---');
        console.log(JSON.stringify(columns, null, 2));
        
        const count = await prisma.monthlyExpense.count();
        console.log('Total expenses:', count);
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
