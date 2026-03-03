/**
 * Notification Model
 * Represents a notification sent to users
 */

class Notification {
  constructor(data) {
    this.userId = data.userId || '';
    this.type = data.type || '';
    this.title = data.title || '';
    this.message = data.message || '';
    this.priority = data.priority || 'normal';
    this.read = data.read || false;
    this.createdAt = data.createdAt || new Date();
    
    // Additional data fields (busId, estimatedArrivalTime, etc.)
    this.busId = data.busId || '';
    this.busNumber = data.busNumber || '';
    this.estimatedArrivalTime = data.estimatedArrivalTime || '';
    this.latitude = data.latitude || 0;
    this.longitude = data.longitude || 0;
  }

  toFirestore() {
    return {
      userId: this.userId,
      type: this.type,
      title: this.title,
      message: this.message,
      priority: this.priority,
      read: this.read,
      createdAt: this.createdAt,
      busId: this.busId,
      busNumber: this.busNumber,
      estimatedArrivalTime: this.estimatedArrivalTime,
      latitude: this.latitude,
      longitude: this.longitude,
    };
  }

  static fromFirestore(doc) {
    const data = doc.data();
    return new Notification({
      id: doc.id,
      ...data
    });
  }
}

module.exports = Notification;
