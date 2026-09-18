// ======================================================
// maintenance.js - Router จัดการแจ้งซ่อมและงานช่าง (Maintenance Routes)
// Endpoint หลัก: /api/maintenance
// รับผิดชอบ: แจ้งซ่อม, มอบหมายงานช่าง, อัปเดตสถานะ, แนบรูปหลักฐานผลงาน
// ======================================================

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getAllRequests,
  getRequestById,
  createRequest,
  updateRequest,
  assignStaff,
  updateStatus,
  uploadCompletionProof,
  deleteRequest
} = require('../controllers/maintenanceController');

// ทุก Route ในไฟล์นี้ต้องผ่านการตรวจสอบ JWT Token
router.use(authenticate);

// -------------------------------------------------------
// รายการคำขอแจ้งซ่อมทั่วไป (Maintenance Requests)
// -------------------------------------------------------
// GET /api/maintenance - ดึงรายการแจ้งซ่อม (แยกมุมมองตาม Tenant, Maintenance, Admin)
router.get('/', getAllRequests);

// GET /api/maintenance/:id - ดึงรายละเอียดคำขอซ่อมตาม ID
router.get('/:id', getRequestById);

// POST /api/maintenance - ผู้เช่าส่งคำขอแจ้งซ่อมใหม่ (แนบรูปภาพได้สูงสุด 5 รูป)
router.post('/', authorize('TENANT'), upload.array('images', 5), createRequest);

// PUT /api/maintenance/:id - แก้ไขคำขอแจ้งซ่อม (แนบรูปเพิ่มเติมได้สูงสุด 5 รูป)
router.put('/:id', upload.array('images', 5), updateRequest);

// DELETE /api/maintenance/:id - ลบคำขอแจ้งซ่อม
router.delete('/:id', deleteRequest);

// -------------------------------------------------------
// การจัดการโดยผู้ดูแลระบบ (Admin Actions)
// -------------------------------------------------------
// POST /api/maintenance/:id/assign - Admin มอบหมายงานแจ้งซ่อมให้ช่าง พร้อมกำหนดวันนัดหมาย
router.post('/:id/assign', authorize('ADMIN'), assignStaff);

// -------------------------------------------------------
// การจัดการโดยช่างซ่อมบำรุง (Staff Actions)
// -------------------------------------------------------
// PUT /api/maintenance/:id/status - Admin หรือ ช่าง อัปเดตสถานะงาน (แนบรูปภาพได้สูงสุด 5 รูป)
router.put('/:id/status', authorize('ADMIN', 'MAINTENANCE'), upload.array('images', 5), updateStatus);

// POST /api/maintenance/:id/completion - ช่างอัปโหลดภาพหลักฐานการซ่อมเสร็จสิ้น (completionProof สูงสุด 5 รูป)
router.post('/:id/completion', authorize('MAINTENANCE'), upload.array('completionProof', 5), uploadCompletionProof);

module.exports = router;
