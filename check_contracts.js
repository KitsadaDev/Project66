const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const contracts = await prisma.rentalContract.findMany({
            include: {
                tenant: true,
                slot: true
            }
        });
        console.log('--- CONTRACTS ---');
        console.log(JSON.stringify(contracts, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
