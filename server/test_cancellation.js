const { PrismaClient } = require('@prisma/client');
const { requestTermination, getCancellationRequests, terminateContract } = require('./src/controllers/contractController');

const prisma = new PrismaClient();

async function runTest() {
  console.log("=== เริ่มการทดสอบระบบขอยกเลิกเช่า (Cancellation System Test) ===\n");
  let testContractId = null;
  let tenantId = null;

  try {
    const activeContract = await prisma.rentalContract.findFirst({
      where: { status: 'ACTIVE' },
      include: { tenant: true, slot: true }
    });

    if (!activeContract) {
      console.log("❌ ไม่พบสัญญาเช่าที่ ACTIVE เลย");
      return;
    }
    testContractId = activeContract.contract_id;
    tenantId = activeContract.tenant_id;
    console.log(`✅ [Step 1] พบสัญญาเช่า ACTIVE หมายเลข ID: ${testContractId} ของผู้เช่า ${activeContract.tenant.first_name}`);

    console.log(`\n⏳ [Step 2] ผู้เช่าส่งคำร้องขอยกเลิกเช่า...`);
    
    // Mock Request & Response for Tenant
    const reqTenant = {
      user: { user_id: tenantId, role: 'TENANT' },
      params: { id: testContractId },
      body: { cancellation_reason: 'TEST_REASON', cancellation_note: 'TEST_NOTE' }
    };
    
    const resTenant = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { console.log("   -> [Response]:", data); return data; }
    };

    const nextFn = (err) => { console.error("   -> [Error from next]:", err); };

    await requestTermination(reqTenant, resTenant, nextFn);

    const check1 = await prisma.rentalContract.findUnique({ where: { contract_id: testContractId } });
    if (check1.status === 'PENDING_TERMINATION' && check1.cancellation_reason === 'TEST_REASON') {
      console.log(`✅ [Step 2 Pass] ฐานข้อมูลอัปเดตเป็น PENDING_TERMINATION และบันทึกเหตุผลสำเร็จ!`);
    } else {
      console.log(`❌ [Step 2 Fail] ฐานข้อมูลไม่อัปเดต! สถานะ: ${check1.status}, เหตุผล: ${check1.cancellation_reason}`);
    }

    console.log(`\n⏳ [Step 3] แอดมินตรวจสอบคำร้องขอยกเลิก...`);
    const reqAdmin = { user: { role: 'ADMIN' } };
    const resAdmin = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { 
        const items = data.data;
        if (items.find(i => i.contract_id === testContractId)) {
          console.log(`✅ [Step 3 Pass] แอดมินมองเห็นคำร้องในรายการขอยกเลิก`);
        } else {
          console.log(`❌ [Step 3 Fail] แอดมินมองไม่เห็นคำร้อง!`);
        }
      }
    };
    await getCancellationRequests(reqAdmin, resAdmin, nextFn);

  } catch (error) {
    console.error("Test Error:", error);
  } finally {
    if (testContractId) {
      console.log('\n⏳ [Cleanup] กำลังคืนค่าสถานะแผงและสัญญาเช่าให้กลับเป็นเหมือนเดิม...');
      await prisma.rentalContract.update({
        where: { contract_id: testContractId },
        data: { status: 'ACTIVE', cancellation_reason: null, cancellation_note: null, cancellation_requested_at: null }
      });
      console.log('✅ [Cleanup] คืนค่าเรียบร้อย!');
    }
    await prisma.$disconnect();
  }
}

runTest();
