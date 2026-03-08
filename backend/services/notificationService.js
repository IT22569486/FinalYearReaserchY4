const { db, admin } = require("../firebase");
const { Notification } = require("../modelsN");
const notificationsCollection = db.collection("notifications");

// Create a new notification
const createNotification = async (userId, notificationData) => {
  const {
    type,
    title,
    message,
    priority = 'normal',
    busId = '',
    busNumber = '',
    estimatedArrivalTime = '',
    latitude = 0,
    longitude = 0,
  } = notificationData;

  const notification = new Notification({
    userId,
    type,
    title,
    message,
    priority,
    read: false,
    createdAt: new Date(),
    busId,
    busNumber,
    estimatedArrivalTime,
    latitude,
    longitude,
  });

  const docRef = await notificationsCollection.add(notification.toFirestore());
  return { id: docRef.id, ...notification.toFirestore() };
};

// Get all notifications for a user
const getNotificationsByUserId = async (userId) => {
  const snapshot = await notificationsCollection
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();
  return snapshot.docs.map((doc) => {
    const notification = Notification.fromFirestore(doc);
    return { id: doc.id, ...notification.toFirestore() };
  });
};

// Get unread notifications for a user
const getUnreadNotifications = async (userId) => {
  const snapshot = await notificationsCollection
    .where("userId", "==", userId)
    .where("read", "==", false)
    .orderBy("createdAt", "desc")
    .get();
  return snapshot.docs.map((doc) => {
    const notification = Notification.fromFirestore(doc);
    return { id: doc.id, ...notification.toFirestore() };
  });
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
  const notification = Notification.fromFirestore(updatedDoc);
  return { id: updatedDoc.id, ...notification.toFirestore() };
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
  return snapshot.docs.map((doc) => {
    const notification = Notification.fromFirestore(doc);
    return { id: doc.id, ...notification.toFirestore() };
  });
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
