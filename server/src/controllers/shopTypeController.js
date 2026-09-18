// ======================================================
// shopTypeController.js - Controller จัดการประเภทหมวดหมู่ร้านค้า (Shop Types)
// รับผิดชอบ: ดึงรายการประเภทหมวดหมู่อาหาร/ร้านค้าสำหรับระบบสัญญาเช่าและแผงค้า
// ======================================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// -------------------------------------------------------
// ฟังก์ชัน: getAllShopTypes
// หน้าที่: ดึงข้อมูลประเภทร้านค้าทั้งหมดในระบบ
//   - เรียงตาม shop_type_id จากน้อยไปมาก
//   - ใช้สำหรับ Dropdown ในหน้าทำสัญญาเช่า และการจัดหมวดหมู่แผง
// -------------------------------------------------------
const getAllShopTypes = async (req, res, next) => {
  try {
    const shopTypes = await prisma.shopType.findMany({
      orderBy: { shop_type_id: 'asc' }
    });
    res.json({ success: true, data: shopTypes });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllShopTypes };
