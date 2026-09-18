// ======================================================
// notificationController.js - Controller จัดการการแจ้งเตือน (Notifications)
// รับผิดชอบ: 
//   - การดึงรายการแจ้งเตือนของผู้ใช้งานแต่ละคน
//   - การทำเครื่องหมายว่าอ่านแล้ว (Mark as Read)
//   - การลบรายการแจ้งเตือน พร้อมตรวจสอบสิทธิ์ความเป็นเจ้าของ
// ======================================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// -------------------------------------------------------
// ฟังก์ชัน: getNotifications
// หน้าที่: ดึงรายการแจ้งเตือนทั้งหมดของผู้ใช้ที่ล็อกอินอยู่ในปัจจุบัน
//   - กรองด้วย user_id จาก req.user (JWT Token)
//   - เรียงลำดับจากล่าสุดไปเก่าสุด (created_at: desc)
// -------------------------------------------------------
const getNotifications = async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        user_id: req.user.user_id,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    res.json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// ฟังก์ชัน: markAsRead
// หน้าที่: เปลี่ยนสถานะการแจ้งเตือนเป็น 'READ' (อ่านแล้ว)
//   - ตรวจสอบว่ามีแจ้งเตือน ID นี้อยู่จริง
//   - ตรวจสอบความปลอดภัย: ผู้ใช้ต้องเป็นเจ้าของการแจ้งเตือนนี้เท่านั้น (ป้องกันแก้ไขของผู้อื่น)
// -------------------------------------------------------
const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { notification_id: parseInt(id) },
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    // ตรวจสอบความปลอดภัย: ป้องกันไม่ให้แก้ไขการแจ้งเตือนของผู้อื่น
    if (notification.user_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const updated = await prisma.notification.update({
      where: { notification_id: parseInt(id) },
      data: { status: 'READ' },
    });

    res.json({ success: true, message: 'Notification marked as read.', data: updated });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// ฟังก์ชัน: deleteNotification
// หน้าที่: ลบรายการแจ้งเตือนออกจากระบบ
//   - ตรวจสอบความปลอดภัย: ลบได้เฉพาะการแจ้งเตือนของตัวเองเท่านั้น
// -------------------------------------------------------
const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { notification_id: parseInt(id) },
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    // ตรวจสอบสิทธิ์ความเป็นเจ้าของก่อนลบ
    if (notification.user_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    await prisma.notification.delete({
      where: { notification_id: parseInt(id) },
    });

    res.json({ success: true, message: 'Notification deleted.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  deleteNotification,
};
