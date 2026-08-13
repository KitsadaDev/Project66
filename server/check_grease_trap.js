require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const slots = ['A1','A2','A3','A4','A5','A6','A7','A8','A9','A10','A11','B1','B2','B3','B4','B5','B6','B7','B8'];
  
  const results = await prisma.rentalSlot.findMany({
    where: { slot_number: { in: slots } },
    include: {
      rental_contracts: {
        where: { status: 'ACTIVE' },
        include: {
          monthly_expenses: {
            orderBy: { billing_month: 'desc' },
            take: 1
          }
        }
      }
    },
    orderBy: { slot_number: 'asc' }
  });

  const report = results.map(slot => {
    const contract = slot.rental_contracts[0];
    if (!contract) return `${slot.slot_number}: VACANT`;
    const expense = contract.monthly_expenses[0];
    return `${slot.slot_number}: ACTIVE (Menu: ${contract.menuType}) -> GreaseFee in Last Bill: ${expense ? expense.grease_trap_fee : 'No Bill Yet'}`;
  });

  console.log(report.join('\n'));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
