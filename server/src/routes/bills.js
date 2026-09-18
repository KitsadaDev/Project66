// ======================================================
// bills.js - Router จัดการค่าใช้จ่ายและบิลรายเดือน (Billing & Payment Routes)
// Endpoint หลัก: /api/bills
// รับผิดชอบ: การออกบิลค่าเช่า/ค่าน้ำ/ค่าไฟ, คำนวณยอดเงิน, อัปโหลดสลิป และตรวจสอบการชำระเงิน
// ======================================================

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getAllBills,
  getBillById,
  createBill,
  updateBill,
  uploadPaymentProof,
  verifyPayment,
  getPaymentHistory,
  getDueBills,
  calculateAmount
} = require('../controllers/billController');

// ทุก Route ในไฟล์นี้ต้องผ่านการตรวจสอบ JWT Token
router.use(authenticate);

// -------------------------------------------------------
// รายการบิลและการคำนวณยอด (Billing Routes)
// -------------------------------------------------------
// GET /api/bills - ดึงรายการบิลทั้งหมด (ผู้เช่าเห็นเฉพาะของตน, Admin/Executive เห็นทั้งหมด)
router.get('/', getAllBills);

// POST /api/bills/calculate - จำลองการคำนวณยอดเงินจากหน่วยน้ำไฟและค่าปรับ (เฉพาะ ADMIN)
router.post('/calculate', authorize('ADMIN'), calculateAmount);

// GET /api/bills/history - ดึงประวัติการชำระเงินที่ยืนยันแล้ว
router.get('/history', getPaymentHistory);

// GET /api/bills/due-soon - ดึงรายการบิลที่ใกล้ครบกำหนดชำระ (หรือเกินกำหนด)
router.get('/due-soon', getDueBills);

// GET /api/bills/:id - ดึงรายละเอียดของบิลรายเดือนตาม ID
router.get('/:id', getBillById);

// POST /api/bills - Admin สร้างบิลรายเดือนใหม่
router.post('/', authorize('ADMIN'), createBill);

// PUT /api/bills/:id - Admin แก้ไขข้อมูลบิล
router.put('/:id', authorize('ADMIN'), updateBill);

// -------------------------------------------------------
// การแจ้งชำระเงินและตรวจสอบสลิป (Payment Routes)
// -------------------------------------------------------
// POST /api/bills/:id/payment - ผู้เช่าอัปโหลดสลิปหลักฐานการโอนเงิน (paymentProof)
router.post('/:id/payment', upload.single('paymentProof'), uploadPaymentProof);

// POST /api/bills/payment/:payment_id/verify - Admin ตรวจสอบอนุมัติหรือปฏิเสธสลิปการชำระเงิน
router.post('/payment/:payment_id/verify', authorize('ADMIN'), verifyPayment);

module.exports = router;
