const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getAllContracts,
  getContractById,
  createContract,
  updateContract,
  terminateContract,
  requestTermination,
  rejectTermination
} = require('../controllers/contractController');

// All routes require authentication
router.use(authenticate);

// Contract routes
router.get('/', authorize('ADMIN', 'EXECUTIVE', 'TENANT'), getAllContracts);
router.get('/:id', getContractById);
router.post('/', authorize('ADMIN'), upload.single('contractFile'), createContract);
router.put('/:id', authorize('ADMIN'), upload.single('contractFile'), updateContract);
router.post('/:id/terminate', authorize('ADMIN'), terminateContract);
router.post('/:id/request-termination', authorize('TENANT'), requestTermination);
router.post('/:id/reject-termination', authorize('ADMIN'), rejectTermination);

module.exports = router;
