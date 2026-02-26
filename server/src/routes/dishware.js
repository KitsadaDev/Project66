const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getDishwareUsages,
  createDishwareUsage,
  getDishwareSummary,
  deleteDishwareUsage,
  approveDishwareUsage,
  rejectDishwareUsage
} = require('../controllers/dishwareController');

// GET /api/dishware/summary — สรุปรายเดือน (Admin + Executive)
router.get('/summary', authenticate, authorize('ADMIN', 'EXECUTIVE'), getDishwareSummary);

// GET /api/dishware — ดึงรายการ (ทุก role ที่ login)
router.get('/', authenticate, getDishwareUsages);

// POST /api/dishware — บันทึกรายการ (Admin หรือ Tenant ได้)
router.post('/', authenticate, authorize('ADMIN', 'TENANT'), createDishwareUsage);

// PATCH /api/dishware/:id/approve — อนุมัติรายการ (Admin only)
router.patch('/:id/approve', authenticate, authorize('ADMIN'), approveDishwareUsage);

// PATCH /api/dishware/:id/reject — ปฏิเสธรายการ (Admin only)
router.patch('/:id/reject', authenticate, authorize('ADMIN'), rejectDishwareUsage);

// DELETE /api/dishware/:id — ลบรายการ (Admin only)
router.delete('/:id', authenticate, authorize('ADMIN'), deleteDishwareUsage);

module.exports = router;
