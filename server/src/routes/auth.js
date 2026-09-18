// ======================================================
// auth.js - Router ระบบยืนยันตัวตน (Authentication Routes)
// Endpoint หลัก: /api/auth
// รับผิดชอบ: เส้นทางสำหรับการสมัครสมาชิก, เข้าสู่ระบบ, ดู/แก้ไขโปรไฟล์ และเปลี่ยนรหัสผ่าน
// ======================================================

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  register,
  login,
  getProfile,
  updateProfile,
  updatePushToken,
  changePassword
} = require('../controllers/authController');

const upload = require('../middleware/upload');

// -------------------------------------------------------
// เส้นทางสาธารณะ (Public Routes - ไม่ต้องล็อกอิน)
// -------------------------------------------------------
// POST /api/auth/register - สมัครสมาชิกใหม่ (รองรับการแนบรูปโปรไฟล์ 1 รูป)
router.post('/register', upload.single('profileImage'), register);

// POST /api/auth/login - เข้าสู่ระบบด้วย username/password เพื่อรับ JWT Token
router.post('/login', login);

// -------------------------------------------------------
// เส้นทางที่ต้องยืนยันตัวตน (Protected Routes - ต้องผ่าน authenticate)
// -------------------------------------------------------
// GET /api/auth/me - ดึงข้อมูลโปรไฟล์ของผู้ใช้งานที่ล็อกอินอยู่ในปัจจุบัน
router.get('/me', authenticate, getProfile);

// PUT /api/auth/me - อัปเดตข้อมูลส่วนตัว (รองรับการเปลี่ยนรูปโปรไฟล์ใหม่)
router.put('/me', authenticate, upload.single('profileImage'), updateProfile);

// PUT /api/auth/push-token - บันทึก/อัปเดต Expo Push Token ของอุปกรณ์มือถือสำหรับรับแจ้งเตือน
router.put('/push-token', authenticate, updatePushToken);

// POST /api/auth/change-password - เปลี่ยนรหัสผ่านใหม่ (ต้องระบุรหัสผ่านเดิม)
router.post('/change-password', authenticate, changePassword);

module.exports = router;
