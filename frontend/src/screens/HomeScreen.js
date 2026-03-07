import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { useSession } from '../context/SessionContext';
import { updateLastActivity } from '../utils/authUtils';
import BusSafetyCard from '../components/BusSafetyCard';
import apiClient from '../api/axiosConfig';

const HomeScreen = () => {
  const navigation = useNavigation();
  const { refreshSession } = useSession();
  const [userName, setUserName] = useState('');
  const [activeBusId, setActiveBusId] = useState(null);
  const [allBuses, setAllBuses] = useState([]);
  const [busSearch, setBusSearch] = useState('');
  const [showBusPicker, setShowBusPicker] = useState(false);
  const [loadingBuses, setLoadingBuses] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchUserData();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchUserData = async () => {
    try {
      await updateLastActivity();
      await refreshSession();
      
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const decodedToken = jwtDecode(token);
        setUserName(decodedToken.name || 'User');
      }

      // Load last tracked bus for safety card
      const lastBusId = await AsyncStorage.getItem('lastTrackedBusId');
      if (lastBusId) setActiveBusId(lastBusId);
    } catch (error) {
      console.error('Error in HomeScreen:', error);
    }
  };

  const fetchBuses = async () => {
    setLoadingBuses(true);
    try {
      const res = await apiClient.get('/api/bus');
      setAllBuses(res.data || []);
    } catch (err) {
      console.error('Failed to fetch buses:', err);
    } finally {
      setLoadingBuses(false);
    }
  };

  const openBusPicker = () => {
    setShowBusPicker(true);
    setBusSearch('');
    if (allBuses.length === 0) fetchBuses();
  };

  const selectBus = async (bus) => {
    const busId = bus.busId || bus.vehicle_id || bus._id;
    setActiveBusId(busId);
    await AsyncStorage.setItem('lastTrackedBusId', busId);
    setShowBusPicker(false);
    setBusSearch('');
  };

  const filteredBuses = allBuses.filter(b => {
    const q = busSearch.toLowerCase();
    return (
      (b.busId || b.vehicle_id || '').toLowerCase().includes(q) ||
      (b.busNumber || '').toLowerCase().includes(q) ||
      (b.routeNumber || b.route_id || '').toLowerCase().includes(q)
    );
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>{userName}</Text>
        </View>

        <TouchableOpacity 
          style={[styles.card, styles.primaryCard]} 
          onPress={() => navigation.navigate('Routes')}
        >
          <Ionicons name="search-circle" size={44} color="#fff" />
          <View>
            <Text style={styles.primaryCardTitle}>Find Your Bus</Text>
            <Text style={styles.primaryCardSubtitle}>Explore routes and see live bus locations</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.cardGrid}>
          <TouchableOpacity 
            style={[styles.card, styles.secondaryCard]} 
            onPress={() => navigation.navigate('CurrentTrip')}
          >
            <Ionicons name="bus-outline" size={32} color="#333" />
            <Text style={styles.secondaryCardTitle}>My Trip</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.card, styles.secondaryCard]} 
            onPress={() => navigation.navigate('Timetable')} 
          >
            <Ionicons name="calendar-outline" size={32} color="#333" />
            <Text style={styles.secondaryCardTitle}>Timetables</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.card, styles.tertiaryCard]}
          onPress={() => navigation.navigate('Profile')} 
        >
          <Ionicons name="person-circle-outline" size={32} color="#007AFF" />
          <View style={styles.tertiaryCardTextContainer}>
            <Text style={styles.tertiaryCardTitle}>My Account</Text>
            <Text style={styles.tertiaryCardSubtitle}>Manage your profile and settings</Text>
          </View>
          <Ionicons name="chevron-forward-outline" size={24} color="#C7C7CC" />
        </TouchableOpacity>

        {/* Bus Safety Section */}
        <View style={styles.sectionHeader}>
          <Ionicons name="shield-checkmark-outline" size={22} color="#333" />
          <Text style={styles.sectionTitle}>Bus Safety</Text>
          <TouchableOpacity style={styles.changeBusBtn} onPress={openBusPicker}>
            <Ionicons name="swap-horizontal-outline" size={18} color="#007AFF" />
            <Text style={styles.changeBusText}>{activeBusId ? 'Change' : 'Select Bus'}</Text>
          </TouchableOpacity>
        </View>

        {/* Bus Picker Dropdown */}
        {showBusPicker && (
          <View style={styles.pickerCard}>
            <View style={styles.pickerSearchRow}>
              <Ionicons name="search-outline" size={18} color="#999" />
              <TextInput
                style={styles.pickerInput}
                placeholder="Search by bus ID or route..."
                value={busSearch}
                onChangeText={setBusSearch}
                autoFocus
              />
              <TouchableOpacity onPress={() => setShowBusPicker(false)}>
                <Ionicons name="close-circle" size={20} color="#aaa" />
              </TouchableOpacity>
            </View>
            {loadingBuses ? (
              <ActivityIndicator style={{ padding: 16 }} color="#007AFF" />
            ) : filteredBuses.length === 0 ? (
              <Text style={styles.noBusesText}>No buses found</Text>
            ) : (
              <ScrollView style={styles.busList} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                {filteredBuses.map((item) => {
                  const itemId = item.busId || item.vehicle_id || item._id;
                  return (
                    <TouchableOpacity key={itemId} style={styles.busItem} onPress={() => selectBus(item)}>
                      <Ionicons name="bus-outline" size={20} color="#007AFF" />
                      <View style={styles.busItemText}>
                        <Text style={styles.busItemId}>{item.vehicle_id || item.busId || item.busNumber}</Text>
                        {(item.route_id || item.routeNumber) ? (
                          <Text style={styles.busItemRoute}>{item.route_id || ('Route ' + item.routeNumber)}</Text>
                        ) : null}
                      </View>
                      {activeBusId === itemId && (
                        <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}

        {activeBusId ? (
          <BusSafetyCard busId={activeBusId} />
        ) : (
          <View style={[styles.card, styles.emptySafetyCard]}>
            <Ionicons name="shield-outline" size={40} color="#ccc" />
            <Text style={styles.emptySafetyTitle}>No Bus Selected</Text>
            <Text style={styles.emptySafetySubtitle}>
              Tap "Select Bus" above to choose a bus and view its live safety score
            </Text>
            <TouchableOpacity style={styles.emptySafetyButton} onPress={openBusPicker}>
              <Text style={styles.emptySafetyButtonText}>Select a Bus</Text>
              <Ionicons name="arrow-forward" size={16} color="#007AFF" />
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F4F8',
  },
  scrollContainer: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    color: '#666',
  },
  userName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryCard: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 15,
  },
  primaryCardSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 15,
  },
  cardGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secondaryCard: {
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  secondaryCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 10,
  },
  tertiaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tertiaryCardTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  tertiaryCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
  },
  tertiaryCardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  changeBusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#EAF3FF',
    borderRadius: 12,
  },
  changeBusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  pickerCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden',
  },
  pickerSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 8,
  },
  pickerInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  busList: {
    maxHeight: 200,
  },
  busItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    gap: 10,
  },
  busItemText: {
    flex: 1,
  },
  busItemId: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
  },
  busItemRoute: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  noBusesText: {
    textAlign: 'center',
    color: '#aaa',
    padding: 20,
    fontSize: 14,
  },
  emptySafetyCard: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptySafetyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#aaa',
    marginTop: 12,
    marginBottom: 6,
  },
  emptySafetySubtitle: {
    fontSize: 13,
    color: '#bbb',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  emptySafetyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#EAF3FF',
    borderRadius: 20,
  },
  emptySafetyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
});

export default HomeScreen;