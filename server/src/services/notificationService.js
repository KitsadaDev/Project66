// ======================================================
// notificationService.js - Service สำหรับสร้างการแจ้งเตือนอัตโนมัติ
// ถูกเรียกโดย Cron Job ทุกวันเวลาเที่ยงคืน (00:00)
// ======================================================

// นำเข้า Prisma Client สำหรับติดต่อฐานข้อมูล
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// -------------------------------------------------------
// ฟังก์ชัน: checkUpcomingBills
// หน้าที่: ตรวจสอบบิลที่กำลังจะครบกำหนดในอีก 5 วัน
//          แล้วสร้างการแจ้งเตือนส่งให้ผู้เช่าแต่ละคน
// เรียกใช้โดย: cron job ใน index.js ทุกเที่ยงคืน
// -------------------------------------------------------
const checkUpcomingBills = async () => {
  try {
    // กำหนดวันปัจจุบัน (ตัดเวลาออก เหลือแค่วันที่)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // คำนวณวันที่เป้าหมาย = วันนี้ + 5 วัน (วันที่ครบกำหนด)
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + 5);

    // วันถัดไปจาก targetDate ใช้สำหรับกำหนด range ค้นหาใน DB
    const nextDay = new Date(targetDate);
    nextDay.setDate(targetDate.getDate() + 1);

    console.log(`[NotificationService] Checking bills due between ${targetDate.toISOString()} and ${nextDay.toISOString()}`);

    // ค้นหาบิลที่:
    // 1. สถานะ PENDING (ยังไม่ชำระ)
    // 2. due_date อยู่ในช่วง [targetDate, nextDay) = ครบกำหนดพอดีในอีก 5 วัน
    const upcomingExpenses = await prisma.monthlyExpense.findMany({
      where: {
        status: 'PENDING',
        due_date: {
          gte: targetDate, // มากกว่าหรือเท่ากับ targetDate
          lt: nextDay,     // น้อยกว่า nextDay (exclusive)
        },
      },
      // ดึงข้อมูล contract และ tenant ที่เชื่อมกันมาด้วย
      include: {
        contract: {
          include: {
            tenant: true, // ดึงข้อมูลผู้เช่า เพื่อรู้ว่าต้องส่งแจ้งเตือนไปให้ใคร
          },
        },
      },
    });

    console.log(`[NotificationService] Found ${upcomingExpenses.length} upcoming bills for reminders.`);

    // วนลูปสร้างการแจ้งเตือนสำหรับบิลแต่ละรายการที่พบ
    for (const expense of upcomingExpenses) {
      await createBillReminder(expense);
    }

    // คืนค่าจำนวนบิลที่ถูกแจ้งเตือน
    return upcomingExpenses.length;
  } catch (error) {
    console.error('[NotificationService] Error checking upcoming bills:', error);
    throw error;
  }
};

// -------------------------------------------------------
// ฟังก์ชัน: createBillReminder
// หน้าที่: สร้าง notification record ในฐานข้อมูลสำหรับบิลแต่ละรายการ
//          มีการตรวจสอบว่าเคยสร้างแจ้งเตือนนี้ไปแล้วหรือยัง
//          (ป้องกันการส่งแจ้งเตือนซ้ำซ้อนในกรณีที่ cron รันซ้ำ)
// @param {Object} expense - ข้อมูล MonthlyExpense พร้อม contract และ tenant
// -------------------------------------------------------
const createBillReminder = async (expense) => {
  try {
    // ดึง ID ของผู้เช่าจาก contract ที่เชื่อมกับบิลนี้
    const tenantId = expense.contract.tenant_id;

    // แปลงจำนวนเงินเป็น string พร้อมใส่ comma (เช่น 1,500)
    const amount = expense.total_amount.toLocaleString();

    // แปลงเดือนของบิลเป็นภาษาไทย (เช่น "มกราคม 2568")
    const month = new Date(expense.billing_month).toLocaleDateString('th-TH', {
      month: 'long',
      year: 'numeric',
    });

    // กำหนดหัวเรื่องและเนื้อหาของการแจ้งเตือน
    const title = 'แจ้งเตือน: บิลค่าเช่าใกล้ถึงกำหนดชำระ';
    const message = `บิลรอบเดือน ${month} จำนวน ฿${amount} จะครบกำหนดชำระในวันที่ 10 (อีก 5 วัน) หากชำระล่าช้าจะมีค่าปรับตามที่ระบุในสัญญา`;

    // ตรวจสอบว่าเคยสร้างแจ้งเตือนนี้ไปแล้วหรือยัง
    // โดยค้นหาจาก user_id + reference_id (expense_id) + title
    // เพื่อป้องกันการแจ้งเตือนซ้ำ ถ้า cron รันวันเดิมสองครั้ง
    const existing = await prisma.notification.findFirst({
      where: {
        user_id: tenantId,
        reference_id: expense.expense_id,
        title: title,
      },
    });

    // ถ้ามีแจ้งเตือนนี้อยู่แล้ว → ข้าม ไม่สร้างซ้ำ
    if (existing) {
      console.log(`[NotificationService] Reminder already exists for expense ${expense.expense_id}, skipping.`);
      return;
    }

    // สร้าง notification record ใหม่ในฐานข้อมูล
    await prisma.notification.create({
      data: {
        user_id: tenantId,          // ส่งให้ผู้เช่ารายนี้
        title,
        message,
        reference_id: expense.expense_id, // อ้างอิงถึง expense นี้ (ป้องกันซ้ำ)
        status: 'UNREAD',           // สถานะเริ่มต้น = ยังไม่ได้อ่าน
      },
    });

    console.log(`[NotificationService] Created reminder for tenant ${tenantId} regarding expense ${expense.expense_id}`);
  } catch (error) {
    // log error รายบิล แต่ไม่ throw เพื่อให้บิลอื่น ๆ ยังถูกประมวลผลต่อไปได้
    console.error(`[NotificationService] Error creating reminder for expense ${expense.expense_id}:`, error);
  }
};

// Export ทั้งสองฟังก์ชันเพื่อให้ cron job และส่วนอื่น ๆ นำไปใช้
module.exports = {
  checkUpcomingBills,
  createBillReminder,
};
