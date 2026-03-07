import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { BACKEND_URL } from '../config';

const BusSafetyCard = ({ busId, route }) => {
  const [busData, setBusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dmsData, setDmsData] = useState(null);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [dmsAlertAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    fetchBusSafetyData();
    fetchDMSData();
    const safetyInterval = setInterval(fetchBusSafetyData, 5000);
    const dmsInterval = setInterval(fetchDMSData, 3000); // DMS polls every 3s for near-live
    
    // Pulse animation for live indicator
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // DMS alert pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(dmsAlertAnim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
        Animated.timing(dmsAlertAnim, { toValue: 1,   duration: 600, useNativeDriver: true }),
      ])
    ).start();

    return () => {
      clearInterval(safetyInterval);
      clearInterval(dmsInterval);
    };
  }, [busId]);

  const fetchBusSafetyData = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/bus/${busId}/safety`);
      setBusData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching bus safety data:', error);
      setBusData({
        busNumber: busId,
        route: route || 'Loading...',
        safetyScore: 85,
        warnings: {},
        driverName: 'N/A',
        currentSpeed: 0,
      });
      setLoading(false);
    }
  };

  const fetchDMSData = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/bus/${busId}/dms`);
      setDmsData(response.data);
    } catch (error) {
      console.error('Error fetching DMS data:', error);
    }
  };

  const getSafetyColor = (score) => {
    if (score >= 90) return '#4CAF50';
    if (score >= 75) return '#8BC34A';
    if (score >= 60) return '#FFEB3B';
    if (score >= 40) return '#FF9800';
    return '#F44336';
  };

  const getSafetyRating = (score) => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 40) return 'Poor';
    return 'Critical';
  };

  const getWarningIcon = (type) => {
    const icons = {
      drowsiness: 'bed-outline',
      distraction: 'phone-portrait-outline',
      speeding: 'speedometer-outline',
      harsh_braking: 'alert-circle-outline',
      lane_departure: 'swap-horizontal-outline'
    };
    return icons[type] || 'warning-outline';
  };

  // DMS helpers
  const DMS_STATE_INFO = {
    ALERT:           { label: 'Alert & Safe',      icon: 'checkmark-circle-outline', color: '#4CAF50', severity: 'safe' },
    DROWSY:          { label: 'Driver Drowsy',      icon: 'bed-outline',              color: '#FF9800', severity: 'warning' },
    SLEEPING:        { label: 'Driver Sleeping!',   icon: 'moon-outline',             color: '#F44336', severity: 'danger' },
    EYES_CLOSING:    { label: 'Eyes Closing',       icon: 'eye-off-outline',          color: '#FF9800', severity: 'warning' },
    YAWNING:         { label: 'Driver Yawning',     icon: 'happy-outline',            color: '#FF9800', severity: 'warning' },
    PHONE_USE:       { label: 'Phone Usage!',       icon: 'phone-portrait-outline',   color: '#F44336', severity: 'danger' },
    PHONE_WARNING:   { label: 'Phone Warning',      icon: 'phone-portrait-outline',   color: '#FF9800', severity: 'warning' },
    HEAD_TURNED:     { label: 'Driver Distracted!', icon: 'return-up-back-outline',   color: '#F44336', severity: 'danger' },
    HEAD_MOVING:     { label: 'Head Moving',        icon: 'return-up-back-outline',   color: '#FF9800', severity: 'warning' },
    NO_SEATBELT:     { label: 'No Seatbelt!',       icon: 'shield-off-outline',       color: '#F44336', severity: 'danger' },
    SEATBELT_WARNING:{ label: 'Seatbelt Warning',   icon: 'shield-outline',           color: '#FF9800', severity: 'warning' },
    HANDS_OFF_WHEEL: { label: 'Hands Off Wheel',    icon: 'hand-left-outline',        color: '#FF9800', severity: 'warning' },
    'No Face Detected': { label: 'No Face Detected', icon: 'person-remove-outline',  color: '#9E9E9E', severity: 'info' },
  };

  const getDMSStateInfo = (state) => {
    return DMS_STATE_INFO[state] || { label: state || 'Unknown', icon: 'help-circle-outline', color: '#9E9E9E', severity: 'info' };
  };

  const formatDMSTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const isDMSCritical = (state) => {
    return ['SLEEPING', 'PHONE_USE', 'HEAD_TURNED', 'NO_SEATBELT'].includes(state);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading safety data...</Text>
      </View>
    );
  }

  const safetyColor = getSafetyColor(busData?.safetyScore || 0);
  const activeWarnings = Object.entries(busData?.warnings || {}).filter(([_, count]) => count > 0);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.busNumber}>Bus #{busData?.busNumber}</Text>
          <Text style={styles.route}>{busData?.route}</Text>
        </View>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </Animated.View>
      </View>

      {/* Safety Score Circle */}
      <View style={styles.scoreSection}>
        <View style={[styles.scoreCircle, { borderColor: safetyColor }]}>
          <Text style={[styles.scoreValue, { color: safetyColor }]}>
            {busData?.safetyScore || 0}
          </Text>
          <Text style={styles.scoreMax}>/100</Text>
        </View>
        <View style={styles.scoreInfo}>
          <Text style={[styles.rating, { color: safetyColor }]}>
            {getSafetyRating(busData?.safetyScore)}
          </Text>
          <Text style={styles.scoreLabel}>Safety Score</Text>
          <View style={styles.scoreBar}>
            <View 
              style={[
                styles.scoreBarFill, 
                { width: `${busData?.safetyScore}%`, backgroundColor: safetyColor }
              ]} 
            />
          </View>
        </View>
      </View>

      {/* Warnings Section */}
      {activeWarnings.length > 0 && (
        <View style={styles.warningsSection}>
          <View style={styles.warningsHeader}>
            <Ionicons name="warning" size={20} color="#F57C00" />
            <Text style={styles.warningsTitle}>Active Warnings</Text>
          </View>
          <View style={styles.warningsList}>
            {activeWarnings.map(([type, count]) => (
              <View key={type} style={styles.warningItem}>
                <View style={styles.warningLeft}>
                  <Ionicons name={getWarningIcon(type)} size={20} color="#666" />
                  <Text style={styles.warningType}>
                    {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Text>
                </View>
                <View style={styles.warningBadge}>
                  <Text style={styles.warningCount}>{count}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* DMS Live Driver Status */}
      {dmsData && (
        <View style={styles.dmsSection}>
          <View style={styles.dmsSectionHeader}>
            <Ionicons name="eye-outline" size={18} color="#1565C0" />
            <Text style={styles.dmsSectionTitle}>Driver Monitoring (Live)</Text>
            <Animated.View style={{ opacity: dmsAlertAnim }}>
              <View style={styles.dmsLiveDot} />
            </Animated.View>
          </View>

          {/* Current DMS State */}
          {dmsData.dmsState ? (() => {
            const info = getDMSStateInfo(dmsData.dmsState.state);
            return (
              <View style={[styles.dmsStateBadge, { backgroundColor: info.color + '20', borderColor: info.color }]}>
                <Ionicons name={info.icon} size={22} color={info.color} />
                <View style={styles.dmsStateText}>
                  <Text style={[styles.dmsStateLabel, { color: info.color }]}>{info.label}</Text>
                  {dmsData.dmsState.details && (
                    <Text style={styles.dmsStateDetails}>
                      {dmsData.dmsState.details.ear !== undefined ? `EAR: ${dmsData.dmsState.details.ear}` : ''}
                      {dmsData.dmsState.details.hands !== undefined ? `  Hands: ${dmsData.dmsState.details.hands}` : ''}
                    </Text>
                  )}
                </View>
                <Text style={styles.dmsStateTime}>{formatDMSTime(dmsData.dmsState.timestamp)}</Text>
              </View>
            );
          })() : (
            <View style={styles.dmsNoData}>
              <Ionicons name="cloud-offline-outline" size={18} color="#999" />
              <Text style={styles.dmsNoDataText}>No DMS data available</Text>
            </View>
          )}

          {/* Critical DMS Alert Banner */}
          {dmsData.dmsState && isDMSCritical(dmsData.dmsState.state) && (
            <Animated.View style={[styles.dmsCriticalBanner, { opacity: dmsAlertAnim }]}>
              <Ionicons name="warning" size={18} color="#fff" />
              <Text style={styles.dmsCriticalText}>
                ALERT: {getDMSStateInfo(dmsData.dmsState.state).label} — Driver requires attention!
              </Text>
            </Animated.View>
          )}

          {/* Recent DMS Events */}
          {dmsData.recentEvents && dmsData.recentEvents.length > 0 && (
            <View style={styles.dmsEventsList}>
              <Text style={styles.dmsEventsTitle}>Recent Events (30 min)</Text>
              {dmsData.recentEvents.slice(0, 5).map((event, idx) => {
                const evInfo = getDMSStateInfo(event.type);
                return (
                  <View key={event.id || idx} style={styles.dmsEventItem}>
                    <View style={[styles.dmsEventDot, { backgroundColor: evInfo.color }]} />
                    <View style={styles.dmsEventContent}>
                      <Text style={[styles.dmsEventType, { color: evInfo.color }]}>{evInfo.label}</Text>
                      {event.details?.ear !== undefined && (
                        <Text style={styles.dmsEventMeta}>EAR: {event.details.ear}  Hands: {event.details.hands ?? '–'}</Text>
                      )}
                    </View>
                    <Text style={styles.dmsEventTime}>{formatDMSTime(event.timestamp)}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Bus Details */}
      <View style={styles.detailsSection}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons name="person-outline" size={20} color="#666" />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Driver</Text>
              <Text style={styles.detailValue}>{busData?.driverName || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="speedometer-outline" size={20} color="#666" />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Speed</Text>
              <Text style={styles.detailValue}>{busData?.currentSpeed || 0} km/h</Text>
            </View>
          </View>
        </View>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>ETA</Text>
              <Text style={styles.detailValue}>{busData?.eta || 'Calculating...'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Critical Warning Banner */}
      {busData?.safetyScore < 40 && (
        <View style={styles.criticalBanner}>
          <Ionicons name="alert-circle" size={24} color="#fff" />
          <Text style={styles.criticalText}>
            CAUTION: Low safety score detected. Please be alert.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#f0f0f0',
  },
  busNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  route: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F44336',
    marginRight: 6,
  },
  liveText: {
    color: '#F44336',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  scoreMax: {
    fontSize: 14,
    color: '#999',
  },
  scoreInfo: {
    flex: 1,
    marginLeft: 20,
  },
  rating: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  scoreBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  warningsSection: {
    backgroundColor: '#FFF3E0',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  warningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  warningsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
    marginLeft: 8,
  },
  warningsList: {
    gap: 8,
  },
  warningItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
  },
  warningLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  warningType: {
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  warningBadge: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 28,
    alignItems: 'center',
  },
  warningCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailsSection: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailText: {
    marginLeft: 10,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  criticalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F44336',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  criticalText: {
    flex: 1,
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 10,
    fontSize: 14,
  },
  // DMS section
  dmsSection: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#1565C0',
  },
  dmsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  dmsSectionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1565C0',
    marginLeft: 6,
  },
  dmsLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F44336',
  },
  dmsStateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    gap: 10,
  },
  dmsStateText: {
    flex: 1,
    marginLeft: 8,
  },
  dmsStateLabel: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  dmsStateDetails: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  dmsStateTime: {
    fontSize: 11,
    color: '#888',
  },
  dmsNoData: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  dmsNoDataText: {
    color: '#999',
    fontSize: 13,
    marginLeft: 6,
  },
  dmsCriticalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F44336',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    gap: 8,
  },
  dmsCriticalText: {
    flex: 1,
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 6,
  },
  dmsEventsList: {
    borderTopWidth: 1,
    borderTopColor: '#BBDEFB',
    paddingTop: 10,
    marginTop: 4,
    gap: 8,
  },
  dmsEventsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1565C0',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dmsEventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    gap: 8,
  },
  dmsEventDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  dmsEventContent: {
    flex: 1,
    marginLeft: 4,
  },
  dmsEventType: {
    fontSize: 13,
    fontWeight: '600',
  },
  dmsEventMeta: {
    fontSize: 11,
    color: '#888',
    marginTop: 1,
  },
  dmsEventTime: {
    fontSize: 11,
    color: '#888',
  },
});

export default BusSafetyCard;
