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

// All routes require authentication
router.use(authenticate);

// Dashboard stats (Admin/Executive)
router.get('/dashboard', authorize('ADMIN', 'EXECUTIVE'), getDashboardStats);

// Slot routes
router.get('/', getAllSlots);
router.get('/:id', getSlotById);
router.post('/', authorize('ADMIN'), createSlot);
router.put('/:id', authorize('ADMIN'), updateSlot);
router.delete('/:id', authorize('ADMIN'), deleteSlot);

// Meter reading routes
router.get('/:id/meters', getMeterReadings);
router.post('/:id/meters', authorize('ADMIN'), recordMeterReading);

module.exports = router;
