const { db, admin } = require("../firebase");
const notificationsCollection = db.collection("notifications");

// Create a new notification
const createNotification = async (userId, notificationData) => {
  const {
    type, // 'bus_arrival', 'trip_update', 'rating_reminder', 'service_alert', etc.
    title,
    message,
    data = {}, // Additional data like busId, tripId, etc.
    priority = 'normal', // 'high', 'normal', 'low'
  } = notificationData;

  const newNotification = {
    userId,
    type,
    title,
    message,
    data,
    priority,
    read: false,
    createdAt: new Date(),
  };

  const docRef = await notificationsCollection.add(newNotification);
  return { id: docRef.id, ...newNotification };
};

// Get all notifications for a user
const getNotificationsByUserId = async (userId) => {
  const snapshot = await notificationsCollection
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// Get unread notifications for a user
const getUnreadNotifications = async (userId) => {
  const snapshot = await notificationsCollection
    .where("userId", "==", userId)
    .where("read", "==", false)
    .orderBy("createdAt", "desc")
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// Get unread count
const getUnreadCount = async (userId) => {
  const snapshot = await notificationsCollection
    .where("userId", "==", userId)
    .where("read", "==", false)
    .get();
  return snapshot.size;
};

// Mark notification as read
const markAsRead = async (notificationId, userId) => {
  const notificationRef = notificationsCollection.doc(notificationId);
  const notificationDoc = await notificationRef.get();

  if (!notificationDoc.exists) {
    throw new Error("Notification not found");
  }

  if (notificationDoc.data().userId !== userId) {
    throw new Error("Not authorized to update this notification");
  }

  await notificationRef.update({ read: true });
  const updatedDoc = await notificationRef.get();
  return { id: updatedDoc.id, ...updatedDoc.data() };
};

// Mark all notifications as read
const markAllAsRead = async (userId) => {
  const snapshot = await notificationsCollection
    .where("userId", "==", userId)
    .where("read", "==", false)
    .get();

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, { read: true });
  });

  await batch.commit();
  return { message: "All notifications marked as read" };
};

// Delete a notification
const deleteNotification = async (notificationId, userId) => {
  const notificationRef = notificationsCollection.doc(notificationId);
  const notificationDoc = await notificationRef.get();

  if (!notificationDoc.exists) {
    throw new Error("Notification not found");
  }

  if (notificationDoc.data().userId !== userId) {
    throw new Error("Not authorized to delete this notification");
  }

  await notificationRef.delete();
  return { message: "Notification deleted" };
};

// Delete all notifications for a user
const deleteAllNotifications = async (userId) => {
  const snapshot = await notificationsCollection
    .where("userId", "==", userId)
    .get();

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  return { message: "All notifications deleted" };
};

// Get notifications by type
const getNotificationsByType = async (userId, type) => {
  const snapshot = await notificationsCollection
    .where("userId", "==", userId)
    .where("type", "==", type)
    .orderBy("createdAt", "desc")
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// Send notification to multiple users (broadcast)
const sendBroadcastNotification = async (userIds, notificationData) => {
  const results = [];

  for (const userId of userIds) {
    try {
      const notification = await createNotification(userId, notificationData);
      results.push({ userId, success: true, notification });
    } catch (error) {
      results.push({ userId, success: false, error: error.message });
    }
  }

  return results;
};

module.exports = {
  createNotification,
  getNotificationsByUserId,
  getUnreadNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getNotificationsByType,
  sendBroadcastNotification,
};
