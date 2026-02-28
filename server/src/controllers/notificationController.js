const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all notifications for the current user
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

// Mark a notification as read
const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { notification_id: parseInt(id) },
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    // Security check: Ensure notification belongs to the user
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

// Delete a notification (Optional)
const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { notification_id: parseInt(id) },
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

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
