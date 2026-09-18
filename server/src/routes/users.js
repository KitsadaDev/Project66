// ======================================================
// users.js - Router จัดการผู้ใช้งาน (User Management Routes)
// Endpoint หลัก: /api/users
// รับผิดชอบ: CRUD บัญชีผู้ใช้, กำหนดบทบาท (Role), รีเซ็ตรหัสผ่าน
// สิทธิ์การเข้าถึง: เฉพาะ ADMIN และ EXECUTIVE เท่านั้น
// ======================================================

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getAllUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  resetPassword
} = require('../controllers/userController');

const upload = require('../middleware/upload');

// ทุก Route ในไฟล์นี้ต้องผ่านการยืนยันตัวตน และจำกัดสิทธิ์เฉพาะ ADMIN หรือ EXECUTIVE
router.use(authenticate);
router.use(authorize('ADMIN', 'EXECUTIVE'));

// GET /api/users - ดึงรายชื่อผู้ใช้ทั้งหมด (รองรับ filter ตาม role และค้นหาชื่อ)
router.get('/', getAllUsers);

// POST /api/users - ผู้ดูแลระบบสร้างบัญชีผู้ใช้ใหม่ (รองรับอัปโหลดรูปโปรไฟล์)
router.post('/', upload.single('profileImage'), createUser);

// GET /api/users/:id - ดึงข้อมูลผู้ใช้รายบุคคลตาม ID
router.get('/:id', getUserById);

// PUT /api/users/:id - แก้ไขข้อมูลผู้ใช้ตาม ID (รองรับอัปเดตรูปโปรไฟล์)
router.put('/:id', upload.single('profileImage'), updateUser);

// DELETE /api/users/:id - ลบบัญชีผู้ใช้ตาม ID
router.delete('/:id', deleteUser);

// POST /api/users/:id/reset-password - ผู้ดูแลระบบรีเซ็ตรหัสผ่านให้ผู้ใช้
router.post('/:id/reset-password', resetPassword);

module.exports = router;
