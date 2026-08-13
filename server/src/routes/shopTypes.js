const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getAllShopTypes } = require('../controllers/shopTypeController');

// Public (authenticated only)
router.get('/', authenticate, getAllShopTypes);

module.exports = router;
