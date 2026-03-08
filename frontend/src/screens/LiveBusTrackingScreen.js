/**
 * Live Bus Tracking Screen
 * Shows all buses on a map with real-time location updates via Socket.IO
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../api/axiosConfig';
import socketService from '../services/socketService';

const { width } = Dimensions.get('window');

const LiveBusTrackingScreen = () => {
  const navigation = useNavigation();
  const mapRef = useRef(null);
  
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [selectedBus, setSelectedBus] = useState(null);
  const [showList, setShowList] = useState(false);

  // Default region (Colombo, Sri Lanka)
  const defaultRegion = {
    latitude: 6.9271,
    longitude: 79.8612,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  // Fetch initial bus data
  const fetchBuses = useCallback(async () => {
    try {
      // Try to get buses from live locations first
      const response = await apiClient.get('/api/bus');
      const busData = response.data || [];
      
      // Normalize bus data
      const normalizedBuses = busData.map(bus => ({
        bus_id: bus.bus_id || bus.busId || bus.vehicle_id || bus.id,
        route_id: bus.route_id || bus.routeNumber,
        route_name: bus.route_name || bus.routeName,
        latitude: bus.latitude || bus.location?.latitude || bus.location?.lat,
        longitude: bus.longitude || bus.location?.longitude || bus.location?.lng,
        speed: bus.speed || 0,
        passenger_count: bus.passenger_count || bus.occupancy || 0,
        status: bus.status || 'online',
        last_updated: bus.last_updated || bus.updatedAt,
      })).filter(bus => bus.latitude && bus.longitude);
      
      setBuses(normalizedBuses);
      
      // Fit map to show all buses
      if (mapRef.current && normalizedBuses.length > 0) {
        const coordinates = normalizedBuses.map(bus => ({
          latitude: bus.latitude,
          longitude: bus.longitude,
        }));
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }
    } catch (error) {
      console.error('Error fetching buses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Handle real-time location updates
  const handleLocationUpdate = useCallback((data) => {
    setBuses(prevBuses => {
      const index = prevBuses.findIndex(
        b => b.bus_id === data.bus_id || b.bus_id === data.busId
      );
      
      const updatedBus = {
        bus_id: data.bus_id || data.busId,
        route_id: data.route_id,
        route_name: data.route_name,
        latitude: data.latitude,
        longitude: data.longitude,
        speed: data.speed || 0,
        passenger_count: data.passenger_count || data.total_passenger_count,
        status: 'online',
        last_updated: data.timestamp,
      };

      if (index >= 0) {
        const newBuses = [...prevBuses];
        newBuses[index] = { ...newBuses[index], ...updatedBus };
        return newBuses;
      } else if (data.latitude && data.longitude) {
        return [...prevBuses, updatedBus];
      }
      return prevBuses;
    });
  }, []);

  // Handle passenger updates
  const handlePassengerUpdate = useCallback((data) => {
    setBuses(prevBuses => {
      const index = prevBuses.findIndex(
        b => b.bus_id === data.bus_id || b.bus_id === data.busId
      );
      
      if (index >= 0) {
        const newBuses = [...prevBuses];
        newBuses[index] = {
          ...newBuses[index],
          passenger_count: data.total_passenger_count,
          total_weight: data.total_weight,
        };
        return newBuses;
      }
      return prevBuses;
    });
  }, []);

  // Handle connection status
  const handleConnectionStatus = useCallback((status) => {
    setSocketConnected(status.connected);
  }, []);

  // Setup socket connection and event listeners
  useEffect(() => {
    // Connect to socket
    socketService.connect();
    socketService.subscribeToAllBuses();

    // Subscribe to events
    const unsubscribeLocation = socketService.subscribe('bus_location_update', handleLocationUpdate);
    const unsubscribePassenger = socketService.subscribe('passenger_update', handlePassengerUpdate);
    const unsubscribeStatus = socketService.subscribe('connection_status', handleConnectionStatus);

    // Initial fetch
    fetchBuses();

    // Periodic refresh as backup
    const interval = setInterval(fetchBuses, 30000);

    return () => {
      unsubscribeLocation();
      unsubscribePassenger();
      unsubscribeStatus();
      clearInterval(interval);
    };
  }, [fetchBuses, handleLocationUpdate, handlePassengerUpdate, handleConnectionStatus]);

  // Refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBuses();
  }, [fetchBuses]);

  // Focus on a specific bus
  const focusOnBus = (bus) => {
    setSelectedBus(bus);
    if (mapRef.current && bus.latitude && bus.longitude) {
      mapRef.current.animateToRegion({
        latitude: bus.latitude,
        longitude: bus.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }
    setShowList(false);
  };

  // Get bus marker color based on status
  const getBusColor = (bus) => {
    if (bus.status === 'offline') return '#9CA3AF'; // Gray
    if (bus.speed > 0) return '#10B981'; // Green - moving
    return '#F59E0B'; // Amber - stopped
  };

  // Render bus list item
  const renderBusItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.busListItem,
        selectedBus?.bus_id === item.bus_id && styles.busListItemSelected
      ]}
      onPress={() => focusOnBus(item)}
    >
      <View style={[styles.busIcon, { backgroundColor: getBusColor(item) }]}>
        <Ionicons name="bus" size={20} color="#FFFFFF" />
      </View>
      <View style={styles.busListInfo}>
        <Text style={styles.busId}>{item.bus_id}</Text>
        <Text style={styles.busRoute}>{item.route_name || `Route ${item.route_id || 'N/A'}`}</Text>
        <View style={styles.busStats}>
          <Text style={styles.busStat}>
            <Ionicons name="speedometer" size={12} color="#6B7280" /> {item.speed || 0} km/h
          </Text>
          <Text style={styles.busStat}>
            <Ionicons name="people" size={12} color="#6B7280" /> {item.passenger_count || 0}
          </Text>
        </View>
      </View>
      <View style={[styles.statusDot, { backgroundColor: getBusColor(item) }]} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading buses...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Bus Tracking</Text>
        <TouchableOpacity onPress={() => setShowList(!showList)} style={styles.listButton}>
          <Ionicons name={showList ? 'map' : 'list'} size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>

      {/* Connection Status */}
      <View style={[styles.connectionStatus, socketConnected ? styles.connected : styles.disconnected]}>
        <View style={[styles.statusIndicator, socketConnected ? styles.indicatorConnected : styles.indicatorDisconnected]} />
        <Text style={styles.connectionText}>
          {socketConnected ? 'Live Updates Active' : 'Reconnecting...'}
        </Text>
        <Text style={styles.busCount}>{buses.length} buses</Text>
      </View>

      {showList ? (
        /* Bus List View */
        <FlatList
          data={buses}
          renderItem={renderBusItem}
          keyExtractor={item => item.bus_id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="bus-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>No buses available</Text>
            </View>
          }
        />
      ) : (
        /* Map View */
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            initialRegion={defaultRegion}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            {buses.map((bus) => (
              <Marker
                key={bus.bus_id}
                coordinate={{
                  latitude: bus.latitude,
                  longitude: bus.longitude,
                }}
                onPress={() => setSelectedBus(bus)}
              >
                <View style={[styles.busMarker, { backgroundColor: getBusColor(bus) }]}>
                  <Ionicons name="bus" size={16} color="#FFFFFF" />
                </View>
                <Callout tooltip>
                  <View style={styles.callout}>
                    <Text style={styles.calloutTitle}>{bus.bus_id}</Text>
                    <Text style={styles.calloutText}>{bus.route_name || `Route ${bus.route_id}`}</Text>
                    <View style={styles.calloutRow}>
                      <Ionicons name="speedometer" size={14} color="#6B7280" />
                      <Text style={styles.calloutText}> {bus.speed || 0} km/h</Text>
                    </View>
                    <View style={styles.calloutRow}>
                      <Ionicons name="people" size={14} color="#6B7280" />
                      <Text style={styles.calloutText}> {bus.passenger_count || 0} passengers</Text>
                    </View>
                  </View>
                </Callout>
              </Marker>
            ))}
          </MapView>

          {/* Refresh Button */}
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Selected Bus Info Card */}
      {selectedBus && !showList && (
        <View style={styles.selectedBusCard}>
          <View style={styles.selectedBusHeader}>
            <View style={[styles.busIcon, { backgroundColor: getBusColor(selectedBus) }]}>
              <Ionicons name="bus" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.selectedBusInfo}>
              <Text style={styles.selectedBusId}>{selectedBus.bus_id}</Text>
              <Text style={styles.selectedBusRoute}>
                {selectedBus.route_name || `Route ${selectedBus.route_id || 'N/A'}`}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedBus(null)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.selectedBusStats}>
            <View style={styles.statItem}>
              <Ionicons name="speedometer" size={20} color="#3B82F6" />
              <Text style={styles.statValue}>{selectedBus.speed || 0}</Text>
              <Text style={styles.statLabel}>km/h</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="people" size={20} color="#10B981" />
              <Text style={styles.statValue}>{selectedBus.passenger_count || 0}</Text>
              <Text style={styles.statLabel}>passengers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="time" size={20} color="#F59E0B" />
              <Text style={styles.statValue}>
                {selectedBus.last_updated 
                  ? new Date(selectedBus.last_updated).toLocaleTimeString() 
                  : 'N/A'}
              </Text>
              <Text style={styles.statLabel}>updated</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.trackButton}
            onPress={() => {
              navigation.navigate('CurrentTrip', { busId: selectedBus.bus_id });
            }}
          >
            <Text style={styles.trackButtonText}>Track This Bus</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  listButton: {
    padding: 4,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  connected: {
    backgroundColor: '#D1FAE5',
  },
  disconnected: {
    backgroundColor: '#FEE2E2',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  indicatorConnected: {
    backgroundColor: '#10B981',
  },
  indicatorDisconnected: {
    backgroundColor: '#EF4444',
  },
  connectionText: {
    flex: 1,
    fontSize: 12,
    color: '#374151',
  },
  busCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  mapContainer: {
    flex: 1,
  },
  busMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  callout: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  calloutText: {
    fontSize: 14,
    color: '#6B7280',
  },
  calloutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  refreshButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  listContainer: {
    padding: 16,
  },
  busListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  busListItemSelected: {
    borderColor: '#3B82F6',
    borderWidth: 2,
  },
  busIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  busListInfo: {
    flex: 1,
  },
  busId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  busRoute: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  busStats: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 12,
  },
  busStat: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9CA3AF',
  },
  selectedBusCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  selectedBusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedBusInfo: {
    flex: 1,
    marginLeft: 12,
  },
  selectedBusId: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  selectedBusRoute: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  selectedBusStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingVertical: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  trackButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default LiveBusTrackingScreen;
