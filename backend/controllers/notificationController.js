const notificationService = require("../services/notificationService");

// Create a notification
exports.handleCreateNotification = async (req, res) => {
  try {
    const { type, title, message, data, priority } = req.body;

    if (!type || !title || !message) {
      return res.status(400).json({ 
        message: "type, title, and message are required" 
      });
    }

    const userId = req.user?.uid || req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Not authorized' });

    const notificationData = {
      type,
      title,
      message,
      data: data || {},
      priority: priority || 'normal',
    };

    const savedNotification = await notificationService.createNotification(userId, notificationData);
    
    // Emit notification via Socket.IO in real-time
    const io = req.io;
    if (io) {
      io.to(`user_${userId}`).emit('notification', savedNotification);
      console.log(`Notification emitted to user ${userId}`);
    }
    
    res.status(201).json(savedNotification);
  } catch (error) {
    res.status(500).json({ message: "Error creating notification", error: error.message });
  }
};

// Get all notifications for the user
exports.handleGetNotifications = async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Not authorized' });

    const notifications = await notificationService.getNotificationsByUserId(userId);
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Error fetching notifications", error: error.message });
  }
};

// Get unread notifications
exports.handleGetUnreadNotifications = async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Not authorized' });

    const notifications = await notificationService.getUnreadNotifications(userId);
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Error fetching unread notifications", error: error.message });
  }
};

// Get unread count
exports.handleGetUnreadCount = async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Not authorized' });

    const count = await notificationService.getUnreadCount(userId);
    res.status(200).json({ unreadCount: count });
  } catch (error) {
    res.status(500).json({ message: "Error fetching unread count", error: error.message });
  }
};

// Mark notification as read
exports.handleMarkAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    if (!notificationId) {
      return res.status(400).json({ message: "notificationId is required" });
    }

    const userId = req.user?.uid || req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Not authorized' });

    const updatedNotification = await notificationService.markAsRead(notificationId, userId);
    res.status(200).json(updatedNotification);
  } catch (error) {
    res.status(500).json({ message: "Error marking notification as read", error: error.message });
  }
};

// Mark all notifications as read
exports.handleMarkAllAsRead = async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Not authorized' });

    const result = await notificationService.markAllAsRead(userId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Error marking all as read", error: error.message });
  }
};

// Delete a notification
exports.handleDeleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;

    if (!notificationId) {
      return res.status(400).json({ message: "notificationId is required" });
    }

    const userId = req.user?.uid || req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Not authorized' });

    const result = await notificationService.deleteNotification(notificationId, userId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Error deleting notification", error: error.message });
  }
};

// Delete all notifications
exports.handleDeleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Not authorized' });

    const result = await notificationService.deleteAllNotifications(userId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Error deleting all notifications", error: error.message });
  }
};

// Get notifications by type
exports.handleGetNotificationsByType = async (req, res) => {
  try {
    const { type } = req.params;

    if (!type) {
      return res.status(400).json({ message: "type is required" });
    }

    const userId = req.user?.uid || req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Not authorized' });

    const notifications = await notificationService.getNotificationsByType(userId, type);
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Error fetching notifications by type", error: error.message });
  }
};
