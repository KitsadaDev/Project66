const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getDishwareTypes, createDishwareType, updateDishwareType, deleteDishwareType } = require('../controllers/dishwareTypeController');

// GET /api/dishware-types — ดึงประเภทภาชนะ (ทุก role ที่ login)
router.get('/', authenticate, getDishwareTypes);

// POST /api/dishware-types — เพิ่มประเภทใหม่ (Admin only)
router.post('/', authenticate, authorize('ADMIN'), createDishwareType);

// PATCH /api/dishware-types/:id — แก้ไข (Admin only)
router.patch('/:id', authenticate, authorize('ADMIN'), updateDishwareType);

// DELETE /api/dishware-types/:id — ลบ/ซ่อน (Admin only)
router.delete('/:id', authenticate, authorize('ADMIN'), deleteDishwareType);

module.exports = router;
