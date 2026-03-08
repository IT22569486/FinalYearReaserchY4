const admin = require('firebase-admin');
const db = admin.firestore();
const dmsService = require('./dmsService');

class SafetyScoreService {
  constructor() {
    this.warningWeights = {
      // Legacy / context-aware monitoring types
      drowsiness: 15,      distraction: 12,    speeding: 10,
      harsh_braking: 8,   lane_departure: 5,  tailgating: 8,
      phone_usage: 12,    no_seatbelt: 10,
      // Uppercase legacy aliases
      DROWSY_DRIVER: 15,  DISTRACTED_DRIVER: 12, SPEEDING: 10,
      HARSH_BRAKING: 8,   LANE_DEPARTURE: 5,  TAILGATING: 8,
      PHONE_USAGE: 12,    NO_SEATBELT: 10,
      // DMS exact violation types (from driver_monitor.py _publish_event)
      SLEEPING: 20,        DROWSY: 15,          EYES_CLOSING: 8,
      PHONE_USE: 15,       PHONE_WARNING: 8,
      HEAD_TURNED: 12,     HEAD_MOVING: 5,
      NO_SEATBELT: 10,     SEATBELT_WARNING: 5,
      HANDS_OFF_WHEEL: 8,  YAWNING: 5,
    };
  }

  calculateSafetyScore(warnings) {
    let baseScore = 100;
    for (const [type, count] of Object.entries(warnings)) {
      const weight = this.warningWeights[type] || 0;
      // Each occurrence deducts weight points, capped at 3x per type
      baseScore -= weight * Math.min(count, 3);
    }
    return Math.max(0, Math.min(100, Math.round(baseScore)));
  }

  getSafetyRating(score) {
    if (score >= 90) return { rating: 'Excellent', color: '#4CAF50' };
    if (score >= 75) return { rating: 'Good',      color: '#8BC34A' };
    if (score >= 60) return { rating: 'Fair',      color: '#FFEB3B' };
    if (score >= 40) return { rating: 'Poor',      color: '#FF9800' };
    return             { rating: 'Critical',       color: '#F44336' };
  }

  async getBusSafetyData(busId) {
    try {
      // 1. Find bus in the buses collection
      let busDoc = await db.collection('buses').doc(busId).get();
      if (!busDoc.exists) {
        const snap = await db.collection('buses').where('vehicle_id', '==', busId).limit(1).get();
        if (!snap.empty) {
          busDoc = snap.docs[0];
        } else {
          const bSnap = await db.collection('buses').where('busId', '==', busId).limit(1).get();
          if (!bSnap.empty) {
            busDoc = bSnap.docs[0];
          }
        }
      }

      if (!busDoc || !busDoc.exists) throw new Error(`Bus not found: ${busId}`);
      const busData = busDoc.data();

      // 2. Find device linked to this bus via busNumber (= vehicle_id)
      const busNumber = busId;
      const deviceSnapshot = await db.collection('devices')
        .where('busNumber', '==', String(busNumber)).limit(1).get();

      // 3. Count violations in last hour using deviceKey
      const warnings = {};
      if (!deviceSnapshot.empty) {
        const deviceKey = deviceSnapshot.docs[0].data().deviceKey;
        const oneHourAgoISO = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        // Single-field query only — no composite index needed; filter/sort in memory
        const vSnap = await db.collection('violations')
          .where('deviceKey', '==', deviceKey)
          .get();
        vSnap.forEach(doc => {
          const data = doc.data();
          const createdAt = typeof data.createdAt === 'string'
            ? data.createdAt
            : data.createdAt?.toDate?.()?.toISOString?.() || '';
          if (createdAt >= oneHourAgoISO) {
            const type = data.type || 'unknown';
            warnings[type] = (warnings[type] || 0) + 1;
          }
        });
      }

      const safetyScore = this.calculateSafetyScore(warnings);
      const { rating, color } = this.getSafetyRating(safetyScore);

      // 4. Route name from route_id field
      let routeName = busData.route_id || 'Unknown Route';

      return {
        busId, busNumber: busId,
        route: routeName, safetyScore, safetyRating: rating, safetyColor: color,
        warnings, driverName: 'N/A',
        currentSpeed: busData.safe_speed || busData.speed || 0,
        location: (busData.latitude && busData.longitude)
          ? { latitude: busData.latitude, longitude: busData.longitude }
          : null,
        status: busData.status || 'active',
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('getBusSafetyData error:', error.message);
      throw error;
    }
  }

  async getRecentWarnings(busId, minutes = 10) {
    try {
      const devSnap = await db.collection('devices').where('busNumber', '==', String(busId)).limit(1).get();
      if (devSnap.empty) return [];
      const deviceKey = devSnap.docs[0].data().deviceKey;
      const timeAgoISO = new Date(Date.now() - minutes * 60 * 1000).toISOString();
      // Single-field query; filter by time in memory to avoid composite index
      const snap = await db.collection('violations')
        .where('deviceKey', '==', deviceKey)
        .get();
      return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => {
          const t = typeof d.createdAt === 'string'
            ? d.createdAt
            : d.createdAt?.toDate?.()?.toISOString?.() || '';
          return t >= timeAgoISO;
        })
        .sort((a, b) => {
          const ta = typeof a.createdAt === 'string' ? a.createdAt : a.createdAt?.toDate?.()?.toISOString?.() || '';
          const tb = typeof b.createdAt === 'string' ? b.createdAt : b.createdAt?.toDate?.()?.toISOString?.() || '';
          return tb.localeCompare(ta);
        })
        .slice(0, 20);
    } catch (error) {
      console.error('getRecentWarnings error:', error.message);
      throw error;
    }
  }

  async updateSafetyScoreRealtime(busId, violationType) {
    const safetyData = await this.getBusSafetyData(busId);
    const busDoc = await db.collection('buses').doc(busId).get();
    if (busDoc.exists) {
      await busDoc.ref.update({
        safetyScore: safetyData.safetyScore, safetyRating: safetyData.safetyRating,
        lastSafetyUpdate: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    if (safetyData.safetyScore < 40) await this.triggerCriticalAlert(busId, safetyData);
    return safetyData;
  }

  async triggerCriticalAlert(busId, safetyData) {
    try {
      await db.collection('notifications').add({
        busId, type: 'critical_safety_alert',
        title: 'CRITICAL SAFETY ALERT',
        message: `Bus ${safetyData.busNumber} safety score is ${safetyData.safetyScore}. Please be cautious.`,
        data: safetyData, timestamp: admin.firestore.FieldValue.serverTimestamp(),
        read: false, priority: 'high',
      });
    } catch (e) { console.error('triggerCriticalAlert error:', e.message); }
  }

  /**
   * Get live DMS state + recent events for a bus.
   * Looks up the device key via busNumber, then queries dms_telemetry / dms_events.
   */
  async getBusDMSData(busId) {
    try {
      // Resolve device key for this bus
      const devSnap = await db.collection('devices')
        .where('busNumber', '==', String(busId)).limit(1).get();

      if (devSnap.empty) {
        return { busId, dmsState: null, recentEvents: [], deviceKey: null };
      }

      const deviceKey = devSnap.docs[0].data().deviceKey;

      // Latest live state
      const dmsState = await dmsService.getDMSState(deviceKey);

      // Single-field query to avoid composite index; sort+filter in memory
      const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const eventsSnap = await db.collection('dms_events')
        .where('device_key', '==', deviceKey)
        .get();

      const recentEvents = eventsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => {
          const t = typeof d.createdAt === 'string'
            ? d.createdAt
            : d.createdAt?.toDate?.()?.toISOString?.() || '';
          return t >= since;
        })
        .sort((a, b) => {
          const ta = typeof a.createdAt === 'string' ? a.createdAt : a.createdAt?.toDate?.()?.toISOString?.() || '';
          const tb = typeof b.createdAt === 'string' ? b.createdAt : b.createdAt?.toDate?.()?.toISOString?.() || '';
          return tb.localeCompare(ta);
        })
        .slice(0, 10);

      return { busId, deviceKey, dmsState, recentEvents };
    } catch (error) {
      console.error('getBusDMSData error:', error.message);
      throw error;
    }
  }
}

module.exports = new SafetyScoreService();
