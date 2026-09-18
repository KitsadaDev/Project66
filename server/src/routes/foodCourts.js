// ======================================================
// foodCourts.js - Router จัดการข้อมูลศูนย์อาหาร (Food Court Routes)
// Endpoint หลัก: /api/food-courts
// รับผิดชอบ: ดึงรายการศูนย์อาหารทั้งหมด และอัปเดตรูปภาพแผนผัง/ภาพหน้าปกศูนย์อาหาร
// ======================================================

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();
const prisma = new PrismaClient();

// -------------------------------------------------------
// Route: GET /api/food-courts
// หน้าที่: ดึงข้อมูลศูนย์อาหารทั้งหมด (เช่น ศูนย์อาหาร 1, ศูนย์อาหาร 2)
// การเข้าถึง: สาธารณะ (ไม่ต้องล็อกอิน เพื่อให้หน้าแรกสามารถแสดงได้)
// -------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const foodCourts = await prisma.foodCourt.findMany({
      orderBy: { food_court_id: 'asc' }
    });
    res.json({ success: true, data: foodCourts });
  } catch (error) {
    console.error('Error fetching food courts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch food courts' });
  }
});

// -------------------------------------------------------
// Route: PUT /api/food-courts/:id/image
// หน้าที่: อัปเดตรูปภาพศูนย์อาหาร (ภาพแผนผังหรือภาพปก)
// การเข้าถึง: เฉพาะผู้ดูแลระบบ (ADMIN)
// -------------------------------------------------------
router.put('/:id/image', authenticate, authorize('ADMIN'), upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // ตรวจสอบว่ามีการส่งไฟล์รูปภาพมาหรือไม่
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }

    // เมื่ออัปโหลดผ่าน middleware upload (Cloudinary) ค่า req.file.path จะเป็น URL ของรูปภาพ
    const image_url = req.file.path;

    // อัปเดต image_url ลงในฐานข้อมูล
    await prisma.$executeRawUnsafe(`
      UPDATE "FoodCourt"
      SET "image_url" = $1
      WHERE "food_court_id" = $2
    `, image_url, parseInt(id));

    // ดึงข้อมูลแถวที่อัปเดตแล้วส่งกลับให้ Frontend
    const updatedFoodCourts = await prisma.$queryRawUnsafe(`
      SELECT * FROM "FoodCourt" WHERE "food_court_id" = $1
    `, parseInt(id));

    res.json({ success: true, message: 'Image updated successfully', data: updatedFoodCourts[0] });
  } catch (error) {
    console.error('Error updating food court image:', error);
    res.status(500).json({ success: false, message: 'Failed to update food court image' });
  }
});

module.exports = router;
