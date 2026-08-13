require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const targetSlots = ['A1','A2','A3','A4','A5','A6','A7','A8','A9','A10','A11','B1','B2','B3','B4','B5','B6','B7','B8'];
  
  // Find slots
  const slots = await prisma.rentalSlot.findMany({
    where: { slot_number: { in: targetSlots } }
  });
  const slotIds = slots.map(s => s.slot_id);

  console.log(`Found ${slotIds.length} target slots in database.`);

  // Update active contracts for these slots
  const result = await prisma.rentalContract.updateMany({
    where: {
      slot_id: { in: slotIds },
      status: 'ACTIVE'
    },
    data: {
      menuType: 'ของคาว'
    }
  });

  console.log(`Updated ${result.count} active contracts to menuType 'ของคาว'.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
