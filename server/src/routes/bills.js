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

// All routes require authentication
router.use(authenticate);

// Expense routes
router.get('/', getAllBills);
router.post('/calculate', authorize('ADMIN', 'EXECUTIVE'), calculateAmount);
router.get('/history', getPaymentHistory);
router.get('/due-soon', getDueBills);
router.get('/:id', getBillById);
router.post('/', authorize('ADMIN', 'EXECUTIVE'), createBill);
router.put('/:id', authorize('ADMIN'), updateBill);

// Payment routes
router.post('/:id/payment', upload.single('paymentProof'), uploadPaymentProof);
router.post('/payment/:payment_id/verify', authorize('ADMIN'), verifyPayment);

module.exports = router;
