const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  resetPassword
} = require('../controllers/userController');

const upload = require('../middleware/upload');

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('ADMIN', 'EXECUTIVE'));

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.put('/:id', upload.single('profileImage'), updateUser);
router.delete('/:id', deleteUser);
router.post('/:id/reset-password', resetPassword);

module.exports = router;
