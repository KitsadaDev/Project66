// ======================================================
// contracts.js - Router สำหรับจัดการ API เส้นทางสัญญาเช่า
// ======================================================

// นำเข้า Express framework และสร้าง Router instance
// Router ช่วยแยกการจัดการ routes ออกเป็นไฟล์ย่อย ๆ
const express = require('express');
const router = express.Router();

// นำเข้า middleware สำหรับตรวจสอบสิทธิ์
// - authenticate: ตรวจสอบว่า request มี JWT token ที่ถูกต้องหรือไม่ (ล็อกอินแล้วหรือเปล่า)
// - authorize: ตรวจสอบว่า user มีสิทธิ์ (role) ที่อนุญาตให้เข้าถึง route นั้น ๆ หรือไม่
const { authenticate, authorize } = require('../middleware/auth');

// นำเข้า middleware สำหรับ upload ไฟล์ (ใช้ multer)
// ใช้สำหรับรับไฟล์สัญญา (PDF หรือเอกสารอื่น ๆ) ที่แนบมากับ request
const upload = require('../middleware/upload');

// นำเข้าฟังก์ชัน controller ทั้งหมดที่เกี่ยวกับสัญญาเช่า
// Controller คือตัวที่จัดการ business logic และติดต่อกับ database
const {
  getAllContracts,       // ดึงรายการสัญญาทั้งหมด
  getContractById,      // ดึงข้อมูลสัญญาตาม ID
  createContract,       // สร้างสัญญาใหม่
  updateContract,       // แก้ไขข้อมูลสัญญา
  terminateContract,    // ยกเลิกสัญญา (Admin ดำเนินการเอง)
  requestTermination,   // ขอยกเลิกสัญญา (Tenant เป็นผู้ส่งคำขอ)
  rejectTermination,    // ปฏิเสธคำขอยกเลิกสัญญา (Admin ปฏิเสธ)
  getCancellationRequests // ดึงรายการคำขอยกเลิกสัญญาทั้งหมด
} = require('../controllers/contractController');

// -------------------------------------------------------
// Middleware กลาง: ทุก route ใน /api/contracts จะต้องผ่าน authenticate ก่อน
// หากไม่มี token หรือ token ไม่ถูกต้อง จะได้รับ 401 Unauthorized ทันที
// -------------------------------------------------------
router.use(authenticate);

// -------------------------------------------------------
// GET /api/contracts/cancellations
// ดึงรายการคำขอยกเลิกสัญญาทั้งหมด
// สิทธิ์: ADMIN, EXECUTIVE (ดูคำขอทั้งหมด), TENANT (ดูเฉพาะของตัวเอง)
// หมายเหตุ: ต้องวางก่อน /:id เพื่อป้องกัน Express ตีความว่า "cancellations" คือ id
// -------------------------------------------------------
router.get('/cancellations', authorize('ADMIN', 'EXECUTIVE', 'TENANT'), getCancellationRequests);

// -------------------------------------------------------
// GET /api/contracts
// ดึงรายการสัญญาทั้งหมด
// สิทธิ์: ADMIN, EXECUTIVE (เห็นทั้งหมด), TENANT (เห็นเฉพาะสัญญาของตัวเอง)
// -------------------------------------------------------
router.get('/', authorize('ADMIN', 'EXECUTIVE', 'TENANT'), getAllContracts);

// -------------------------------------------------------
// GET /api/contracts/:id
// ดึงข้อมูลสัญญาตาม ID ที่ระบุใน URL
// สิทธิ์: ADMIN, EXECUTIVE, TENANT (TENANT เห็นเฉพาะสัญญาของตัวเอง)
// -------------------------------------------------------
router.get('/:id', authorize('ADMIN', 'EXECUTIVE', 'TENANT'), getContractById);

// -------------------------------------------------------
// POST /api/contracts
// สร้างสัญญาใหม่ พร้อมรับไฟล์แนบ 1 ไฟล์ (field name: contractFile)
// upload.single('contractFile') จะประมวลผลไฟล์และเก็บไว้ใน req.file
// สิทธิ์: ADMIN เท่านั้น
// -------------------------------------------------------
router.post('/', authorize('ADMIN'), upload.single('contractFile'), createContract);

// -------------------------------------------------------
// PUT /api/contracts/:id
// แก้ไขข้อมูลสัญญาตาม ID พร้อมรับไฟล์แนบใหม่ได้ (ถ้ามี)
// สิทธิ์: ADMIN เท่านั้น
// -------------------------------------------------------
router.put('/:id', authorize('ADMIN'), upload.single('contractFile'), updateContract);

// -------------------------------------------------------
// POST /api/contracts/:id/terminate
// Admin ยกเลิกสัญญาทันที (Forced Termination) โดยไม่ต้องรอคำขอจาก Tenant
// สิทธิ์: ADMIN เท่านั้น
// -------------------------------------------------------
router.post('/:id/terminate', authorize('ADMIN'), terminateContract);

// -------------------------------------------------------
// POST /api/contracts/:id/request-termination
// Tenant ส่งคำขอยกเลิกสัญญา เพื่อให้ Admin พิจารณา
// สิทธิ์: TENANT เท่านั้น (เฉพาะเจ้าของสัญญา)
// -------------------------------------------------------
router.post('/:id/request-termination', authorize('TENANT'), requestTermination);

// -------------------------------------------------------
// POST /api/contracts/:id/reject-termination
// Admin ปฏิเสธคำขอยกเลิกสัญญาที่ Tenant ส่งมา
// สิทธิ์: ADMIN เท่านั้น
// -------------------------------------------------------
router.post('/:id/reject-termination', authorize('ADMIN'), rejectTermination);

// Export router เพื่อนำไปใช้ใน app.js หรือ index.js หลัก
// โดยปกติจะ mount ที่ /api/contracts
module.exports = router;

