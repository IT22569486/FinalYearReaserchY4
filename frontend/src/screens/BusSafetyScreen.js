import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSession } from '../context/SessionContext';
import { updateLastActivity } from '../utils/authUtils';
import BusSafetyCard from '../components/BusSafetyCard';

const BusSafetyScreen = ({ route }) => {
  const navigation = useNavigation();
  const { refreshSession } = useSession();
  const [activeBusId, setActiveBusId] = useState(null);
  const currentTripBusId = route?.params?.busId;

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchInitialData();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchInitialData = async () => {
    try {
      await updateLastActivity();
      await refreshSession();

      // Prefer bus selected in Current Trip, then fallback to last tracked bus.
      if (currentTripBusId) {
        setActiveBusId(currentTripBusId);
        await AsyncStorage.setItem('lastTrackedBusId', currentTripBusId);
        return;
      }

      // Load last tracked bus for safety card
      const lastBusId = await AsyncStorage.getItem('lastTrackedBusId');
      if (lastBusId) {
        setActiveBusId(lastBusId);
      } else {
        setActiveBusId(null);
      }
    } catch (error) {
      console.error('Error in BusSafetyScreen:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bus Safety Monitor</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Bus Selection Section */}
        <View style={styles.sectionHeader}>
          <Ionicons name="shield-checkmark-outline" size={24} color="#007AFF" />
          <Text style={styles.sectionTitle}>Live Safety Score</Text>
        </View>
        
        <Text style={styles.sectionDescription}>
          Monitor real-time safety metrics for your selected bus including driving behavior, speed compliance, and route adherence.
        </Text>

        <View style={styles.selectBusButton}>
          <Ionicons name="bus-outline" size={20} color="#007AFF" />
          <Text style={styles.selectBusButtonText}>
            {activeBusId ? `Bus: ${activeBusId}` : 'No selected bus from Current Trip'}
          </Text>
          <Ionicons name="shield-checkmark-outline" size={20} color="#007AFF" />
        </View>

        {/* Safety Card or Empty State */}
        {activeBusId ? (
          <BusSafetyCard busId={activeBusId} />
        ) : (
          <View style={[styles.card, styles.emptySafetyCard]}>
            <Ionicons name="shield-outline" size={48} color="#ccc" />
            <Text style={styles.emptySafetyTitle}>No Bus Selected</Text>
            <Text style={styles.emptySafetySubtitle}>
              Open Current Trip and select a bus to view live safety metrics and score here.
            </Text>
            <TouchableOpacity
              style={styles.emptySafetyButton}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Routes' })}
            >
              <Text style={styles.emptySafetyButtonText}>Go to Routes</Text>
              <Ionicons name="arrow-forward" size={16} color="#007AFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle-outline" size={22} color="#007AFF" />
            <Text style={styles.infoTitle}>About Safety Scores</Text>
          </View>
          <Text style={styles.infoText}>
            The safety score is calculated in real-time based on multiple factors including:
          </Text>
          <View style={styles.infoList}>
            <View style={styles.infoListItem}>
              <Ionicons name="speedometer-outline" size={16} color="#666" />
              <Text style={styles.infoListText}>Speed compliance and smooth driving</Text>
            </View>
            <View style={styles.infoListItem}>
              <Ionicons name="locate-outline" size={16} color="#666" />
              <Text style={styles.infoListText}>Route adherence and navigation</Text>
            </View>
            <View style={styles.infoListItem}>
              <Ionicons name="alert-circle-outline" size={16} color="#666" />
              <Text style={styles.infoListText}>Safety violations and incidents</Text>
            </View>
            <View style={styles.infoListItem}>
              <Ionicons name="star-outline" size={16} color="#666" />
              <Text style={styles.infoListText}>Passenger ratings and feedback</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F4F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
  },
  scrollContainer: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111',
    marginLeft: 10,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },
  selectBusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectBusButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginLeft: 12,
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
  emptySafetyCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptySafetyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#aaa',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySafetySubtitle: {
    fontSize: 14,
    color: '#bbb',
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 20,
  },
  emptySafetyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#EAF3FF',
    borderRadius: 20,
  },
  emptySafetyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  infoList: {
    gap: 10,
  },
  infoListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoListText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
});

export default BusSafetyScreen;







