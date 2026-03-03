const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");

// Create a notification
router.post("/create", protect, notificationController.handleCreateNotification);

// Get all notifications (auth required)
router.get("/", protect, notificationController.handleGetNotifications);
// router.get("/", notificationController.handleGetNotifications);

// Get unread notifications (auth required)
router.get("/unread", protect, notificationController.handleGetUnreadNotifications);

// Get unread count (auth required)
router.get("/unread/count", protect, notificationController.handleGetUnreadCount);

// Get notifications by type (auth required)
router.get("/type/:type", protect, notificationController.handleGetNotificationsByType);

// Mark notification as read (auth required)
router.put("/:notificationId/read", protect, notificationController.handleMarkAsRead);

// Mark all notifications as read (auth required)
router.put("/read/all", protect, notificationController.handleMarkAllAsRead);

// Delete a notification (auth required)
router.delete("/:notificationId", protect, notificationController.handleDeleteNotification);

// Delete all notifications (auth required)
router.delete("/", protect, notificationController.handleDeleteAllNotifications);

module.exports = router;
