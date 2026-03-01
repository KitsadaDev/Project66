const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { createNotification } = require('./notificationService'); // if we want to send a notification

/**
 * Checks all active contracts for users with 3 or more unpaid bills.
 * If found, the contract is forcefully terminated and the slot is vacated.
 */
const autoTerminateContracts = async () => {
  try {
    console.log(`[ContractService] Running daily check for 3-month overdue contracts...`);
    
    // Find all ACTIVE contracts
    const activeContracts = await prisma.rentalContract.findMany({
      where: { status: 'ACTIVE' },
      include: {
        expenses: {
          where: { status: 'PENDING' },
          select: { expense_id: true }
        },
        tenant: true,
        slot: true
      }
    });

    let terminatedCount = 0;

    for (const contract of activeContracts) {
      if (contract.expenses.length >= 3) {
        console.log(`[ContractService] Terminating contract ${contract.contract_number} (Tenant: ${contract.tenant_id}) due to ${contract.expenses.length} unpaid bills.`);
        
        // Use a transaction to safely terminate contract and release the stall
        await prisma.$transaction([
          prisma.rentalContract.update({
            where: { contract_id: contract.contract_id },
            data: { status: 'TERMINATED' }
          }),
          prisma.rentalSlot.update({
            where: { slot_id: contract.slot_id },
            data: { status: 'VACANT', tenant_id: null }
          }),
          prisma.notification.create({
            data: {
              user_id: contract.tenant_id,
              title: "แจ้งเตือน: ยกเลิกสัญญาเช่าอัตโนมัติ",
              message: `สัญญาเช่าพื้นที่ ${contract.slot.slot_number} (เลขที่: ${contract.contract_number}) ของคุณถูกยกเลิกเนื่องจากค้างชำระค่าเช่าติดต่อกัน 3 เดือน กรุณาติดต่อสำนักงาน`,
              status: "UNREAD",
            }
          })
        ]);
        terminatedCount++;
      }
    }

    console.log(`[ContractService] Finished check. Terminated ${terminatedCount} contracts.`);
    return terminatedCount;
  } catch (error) {
    console.error('[ContractService] Error in autoTerminateContracts:', error);
    throw error;
  }
};

module.exports = {
  autoTerminateContracts
};
