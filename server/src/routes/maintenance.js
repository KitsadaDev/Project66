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

// All routes require authentication
router.use(authenticate);

// Maintenance request routes
router.get('/', getAllRequests);
router.get('/:id', getRequestById);
router.post('/', authorize('TENANT'), upload.array('images', 5), createRequest);
router.put('/:id', upload.array('images', 5), updateRequest);
router.delete('/:id', deleteRequest);

// Admin routes
router.post('/:id/assign', authorize('ADMIN'), assignStaff);

// Staff routes
router.put('/:id/status', authorize('ADMIN', 'MAINTENANCE'), updateStatus);
router.post('/:id/completion', authorize('MAINTENANCE'), upload.array('completionProof', 5), uploadCompletionProof);

module.exports = router;
