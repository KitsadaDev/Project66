// ======================================================
// shopTypes.js - Router จัดการประเภทหมวดหมู่ร้านค้า (Shop Type Routes)
// Endpoint หลัก: /api/shop-types
// รับผิดชอบ: ดึงข้อมูลหมวดหมู่อาหาร/ประเภทร้านค้าสำหรับแบบฟอร์มทำสัญญา
// ======================================================

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getAllShopTypes } = require('../controllers/shopTypeController');

// GET /api/shop-types - ดึงรายการประเภทหมวดหมู่ร้านค้าทั้งหมด (ต้องล็อกอิน)
router.get('/', authenticate, getAllShopTypes);

module.exports = router;
