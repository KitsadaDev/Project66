const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'db_step_log.txt');
const log = (msg) => {
    fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);
};

fs.writeFileSync(logFile, 'Starting DB check...\n');

async function main() {
    log('Initializing PrismaClient...');
    const prisma = new PrismaClient();
    try {
        log('Connecting...');
        await prisma.$connect();
        log('Connected.');
        
        log('Checking RentalContract count...');
        const count = await prisma.rentalContract.count();
        log(`Count: ${count}`);
        
        log('Checking MonthlyExpense columns via raw SQL...');
        const columns = await prisma.$queryRawUnsafe(`
            SELECT column_name FROM information_schema.columns WHERE table_name = 'MonthlyExpense'
        `);
        log(`Columns found: ${columns.length}`);
        log(JSON.stringify(columns));
        
    } catch (e) {
        log(`ERROR: ${e.message}`);
    } finally {
        log('Disconnecting...');
        await prisma.$disconnect();
        log('Done.');
    }
}

main().catch(e => log(`FATAL: ${e.message}`));
