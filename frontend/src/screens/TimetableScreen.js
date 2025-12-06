import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { BACKEND_URL } from '../config';

// Mock data - replace with API call
const MOCK_TIMETABLES = [
  {
    routeId: '138',
    routeName: 'Colombo - Kottawa',
    schedules: [
      { time: '06:00 AM', start: 'Colombo', end: 'Kottawa', type: 'Weekday' },
      { time: '06:30 AM', start: 'Colombo', end: 'Kottawa', type: 'Weekday' },
      { time: '07:00 AM', start: 'Kottawa', end: 'Colombo', type: 'Weekday' },
      { time: '09:00 AM', start: 'Colombo', end: 'Kottawa', type: 'Weekend' },
    ],
  },
  {
    routeId: '177',
    routeName: 'Kollupitiya - Kaduwela',
    schedules: [
      { time: '05:45 AM', start: 'Kollupitiya', end: 'Kaduwela', type: 'Weekday' },
      { time: '06:15 AM', start: 'Kollupitiya', end: 'Kaduwela', type: 'Weekday' },
      { time: '08:00 AM', start: 'Kaduwela', end: 'Kollupitiya', type: 'Weekend' },
    ],
  },
];

const TimetableScreen = () => {
  const [timetables, setTimetables] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTimetables = async () => {
      try {
        // const response = await axios.get(`${BACKEND_URL}/api/timetables`);
        // setTimetables(response.data);
        
        // Using mock data for now
        setTimetables(MOCK_TIMETABLES);

      } catch (error) {
        console.error("Failed to fetch timetables:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimetables();
  }, []);

  const renderScheduleItem = ({ item }) => (
    <View style={styles.scheduleItem}>
      <Text style={styles.timeText}>{item.time}</Text>
      <View style={styles.routeInfo}>
        <Text style={styles.startEndText}>{item.start}</Text>
        <Ionicons name="arrow-forward" size={16} color="#007AFF" style={styles.arrowIcon} />
        <Text style={styles.startEndText}>{item.end}</Text>
      </View>
      <View style={styles.typeBadge}>
        <Text style={styles.typeText}>{item.type}</Text>
      </View>
    </View>
  );

  const renderRouteCard = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.routeName}>{item.routeName} ({item.routeId})</Text>
      <FlatList
        data={item.schedules}
        renderItem={renderScheduleItem}
        keyExtractor={(schedule, index) => `${item.routeId}-${index}`}
        ListEmptyComponent={<Text style={styles.emptyText}>No schedules available for this route.</Text>}
      />
    </View>
  );

  if (isLoading) {
    return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Bus Timetables</Text>
      <FlatList
        data={timetables}
        renderItem={renderRouteCard}
        keyExtractor={(route) => route.routeId}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={styles.emptyText}>No timetables found.</Text>}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f8' },
  headerTitle: { fontSize: 32, fontWeight: 'bold', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  listContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 15, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  routeName: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10 },
  scheduleItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  timeText: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 0.3 },
  routeInfo: { flexDirection: 'row', alignItems: 'center', flex: 0.5 },
  startEndText: { fontSize: 15, color: '#555' },
  arrowIcon: { marginHorizontal: 5 },
  typeBadge: { backgroundColor: '#eef5ff', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, flex: 0.2, alignItems: 'center' },
  typeText: { color: '#007AFF', fontSize: 12, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: 'gray', marginTop: 20 },
});

export default TimetableScreen;