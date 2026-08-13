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

// Public routes
router.post('/register', upload.single('profileImage'), register);
router.post('/login', login);

// Protected routes
router.get('/me', authenticate, getProfile);
router.put('/me', authenticate, upload.single('profileImage'), updateProfile);
router.put('/push-token', authenticate, updatePushToken);
router.post('/change-password', authenticate, changePassword);

module.exports = router;
