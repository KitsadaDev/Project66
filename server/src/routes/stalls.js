// ======================================================
// stalls.js - Router จัดการแผงค้าและมิเตอร์ (Stall & Meter Routes)
// Endpoint หลัก: /api/stalls
// รับผิดชอบ: ข้อมูลแผงค้า, ผังล็อค, สถานะว่าง/ไม่ว่าง, สถิติภาพรวม และการจดมิเตอร์น้ำไฟ
// ======================================================

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getAllSlots,
  getSlotById,
  createSlot,
  updateSlot,
  deleteSlot,
  recordMeterReading,
  getMeterReadings,
  getDashboardStats
} = require('../controllers/stallController');

// ทุก Route ในไฟล์นี้ต้องผ่านการตรวจสอบ JWT Token
router.use(authenticate);

// -------------------------------------------------------
// สถิติภาพรวมแดชบอร์ด (เฉพาะ ADMIN และ EXECUTIVE)
// -------------------------------------------------------
// GET /api/stalls/dashboard - ดึงสรุปจำนวนแผงทั้งหมด, ว่าง, ไม่ว่าง, ซ่อมแซม และอัตราการเช่า (%)
router.get('/dashboard', authorize('ADMIN', 'EXECUTIVE'), getDashboardStats);

// -------------------------------------------------------
// การจัดการข้อมูลแผงร้านค้า (Slot Management)
// -------------------------------------------------------
// GET /api/stalls - ดึงรายการแผงค้าทั้งหมด (รองรับ filter ตาม food_court_id, status)
router.get('/', getAllSlots);

// GET /api/stalls/:id - ดึงรายละเอียดของแผงค้ารายบุคคลตาม ID
router.get('/:id', getSlotById);

// POST /api/stalls - เพิ่มแผงค้าใหม่ (เฉพาะ ADMIN)
router.post('/', authorize('ADMIN'), createSlot);

// PUT /api/stalls/:id - แก้ไขข้อมูลแผงค้า (เฉพาะ ADMIN)
router.put('/:id', authorize('ADMIN'), updateSlot);

// DELETE /api/stalls/:id - ลบแผงค้า (เฉพาะ ADMIN)
router.delete('/:id', authorize('ADMIN'), deleteSlot);

// -------------------------------------------------------
// การจดบันทึกมิเตอร์น้ำและไฟฟ้า (Meter Readings)
// -------------------------------------------------------
// GET /api/stalls/:id/meters - ดึงประวัติการจดมิเตอร์น้ำและไฟของแผงนี้
router.get('/:id/meters', getMeterReadings);

// POST /api/stalls/:id/meters - บันทึกเลขมิเตอร์น้ำและไฟประจำเดือน (เฉพาะ ADMIN)
router.post('/:id/meters', authorize('ADMIN'), recordMeterReading);

module.exports = router;
