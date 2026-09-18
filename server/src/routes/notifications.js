// ======================================================
// notifications.js - Router จัดการการแจ้งเตือน (Notification Routes)
// Endpoint หลัก: /api/notifications
// รับผิดชอบ: ดึงรายการแจ้งเตือน, ทำเครื่องหมายว่าอ่านแล้ว, ลบการแจ้งเตือน
// ======================================================

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

// ทุก Route ในไฟล์นี้ต้องผ่านการตรวจสอบ JWT Token
router.use(authenticate);

// GET /api/notifications - ดึงรายการแจ้งเตือนทั้งหมดของผู้ใช้ที่ล็อกอิน
router.get('/', notificationController.getNotifications);

// PATCH /api/notifications/:id/read - ทำเครื่องหมายว่าอ่านแล้วตาม notification_id
router.patch('/:id/read', notificationController.markAsRead);

// DELETE /api/notifications/:id - ลบรายการแจ้งเตือนตาม ID
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
