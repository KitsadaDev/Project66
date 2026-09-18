// ======================================================
// contractService.js - Service ยกเลิกสัญญาอัตโนมัติ
// ถูกเรียกโดย Cron Job ทุกวันเวลาเที่ยงคืน (00:00)
// ======================================================

// นำเข้า Prisma Client สำหรับติดต่อฐานข้อมูล
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
// Note: createNotification is not exported from notificationService; notifications are created inline

// -------------------------------------------------------
// ฟังก์ชัน: autoTerminateContracts
// หน้าที่: ตรวจสอบสัญญา ACTIVE ทั้งหมดในระบบ
//          ถ้าพบว่ามีบิลค้างชำระ (PENDING) ตั้งแต่ 3 รายการขึ้นไป
//          → ยกเลิกสัญญาอัตโนมัติ และคืนแผงให้ว่าง (VACANT)
//          → สร้างการแจ้งเตือนส่งให้ผู้เช่าทราบ
// เหตุผล: ป้องกันผู้เช่าที่ค้างชำระติดต่อกัน 3 เดือนโดยไม่มีการดำเนินการ
// -------------------------------------------------------
const autoTerminateContracts = async () => {
  try {
    console.log(`[ContractService] Running daily check for 3-month overdue contracts...`);
    
    // ดึงสัญญาทั้งหมดที่สถานะ ACTIVE พร้อมข้อมูลที่เกี่ยวข้อง
    const activeContracts = await prisma.rentalContract.findMany({
      where: { status: 'ACTIVE' },
      include: {
        // ดึงเฉพาะ expense ที่ยังค้างชำระ (PENDING) เพื่อนับจำนวน
        expenses: {
          where: { status: 'PENDING' },
          select: { expense_id: true } // ดึงแค่ id เพราะต้องการแค่นับจำนวน
        },
        tenant: true, // ข้อมูลผู้เช่า (ใช้สำหรับสร้างแจ้งเตือน)
        slot: true    // ข้อมูลแผง (ใช้แสดงหมายเลขแผงในแจ้งเตือน)
      }
    });

    // ตัวนับจำนวนสัญญาที่ถูกยกเลิกในรอบนี้
    let terminatedCount = 0;

    // วนตรวจแต่ละสัญญา
    for (const contract of activeContracts) {
      // ถ้ามีบิล PENDING ตั้งแต่ 3 รายการขึ้นไป → ยกเลิกสัญญา
      if (contract.expenses.length >= 3) {
        console.log(`[ContractService] Terminating contract ${contract.contract_number} (Tenant: ${contract.tenant_id}) due to ${contract.expenses.length} unpaid bills.`);
        
        // ใช้ Transaction เพื่อให้ทั้ง 3 คำสั่งสำเร็จพร้อมกัน
        // หากขั้นตอนใดล้มเหลว จะ rollback ทั้งหมด (ป้องกันข้อมูลครึ่งๆ กลางๆ)
        await prisma.$transaction([
          // 1. เปลี่ยนสถานะสัญญา → TERMINATED
          prisma.rentalContract.update({
            where: { contract_id: contract.contract_id },
            data: { status: 'TERMINATED' }
          }),
          // 2. คืนแผงให้ว่าง เพื่อให้ Admin นำไปให้ผู้เช่ารายใหม่ได้
          prisma.rentalSlot.update({
            where: { slot_id: contract.slot_id },
            data: { status: 'VACANT' }
          }),
          // 3. สร้างการแจ้งเตือนในระบบให้ผู้เช่าทราบว่าสัญญาถูกยกเลิก
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
    // คืนจำนวนสัญญาที่ถูกยกเลิกในรอบนี้
    return terminatedCount;
  } catch (error) {
    console.error('[ContractService] Error in autoTerminateContracts:', error);
    throw error;
  }
};

// Export ฟังก์ชันเพื่อให้ cron job ใน index.js นำไปใช้
module.exports = {
  autoTerminateContracts
};
