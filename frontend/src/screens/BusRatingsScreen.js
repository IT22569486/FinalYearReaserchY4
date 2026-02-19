import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../api/axiosConfig';
import RatingsDisplay from '../components/RatingsDisplay';

const BusRatingsScreen = ({ route, navigation }) => {
  const { busId, busNumber } = route.params || {};

  const [ratings, setRatings] = useState([]);
  const [averageRatings, setAverageRatings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('average'); // 'average' or 'all'

  useEffect(() => {
    fetchRatings();
  }, [busId]);

  const fetchRatings = async () => {
    if (!busId) {
      Alert.alert('Error', 'Bus ID not found');
      navigation.goBack();
      return;
    }

    setLoading(true);
    try {
      // Fetch individual ratings
      const ratingsRes = await apiClient.get(`/api/ratings/bus/${busId}`);
      setRatings(ratingsRes.data || []);

      // Fetch average ratings
      try {
        const avgRes = await apiClient.get(`/api/ratings/bus/${busId}/average`);
        setAverageRatings(avgRes.data);
      } catch (error) {
        console.log('No average ratings found yet');
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
      Alert.alert('Error', 'Failed to fetch ratings');
    } finally {
      setLoading(false);
    }
  };

  const RatingStatistic = ({ rating, label }) => {
    if (!rating) return null;
    return (
      <View style={styles.statisticItem}>
        <Text style={styles.statisticLabel}>{label}</Text>
        <View style={styles.statisticValue}>
          <Text style={styles.statisticNumber}>{rating}</Text>
          <Ionicons name="star" size={20} color="#FFD700" />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading ratings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="bus" size={28} color="#2196F3" />
          <View style={styles.busInfo}>
            <Text style={styles.headerTitle}>Bus Ratings</Text>
            <Text style={styles.busNumberText}>{busNumber || busId}</Text>
          </View>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Average Ratings Section */}
        {averageRatings && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overall Performance</Text>
            <View style={styles.averageRatingsContainer}>
              <RatingStatistic
                rating={averageRatings.averageDriverRating}
                label="Driver Quality"
              />
              <RatingStatistic
                rating={averageRatings.averageOnTimeToStopRating}
                label="On-Time (Stop)"
              />
              <RatingStatistic
                rating={averageRatings.averageOnTimeToDestinationRating}
                label="On-Time (Destination)"
              />
              <RatingStatistic
                rating={averageRatings.averageOverallRating}
                label="Overall"
              />
            </View>
            <Text style={styles.totalRatingsText}>
              Based on {averageRatings.totalRatings} rating{averageRatings.totalRatings !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* All Ratings Section */}
        {ratings.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Recent Ratings ({ratings.length})
            </Text>
            {ratings.map((rating, index) => (
              <View key={rating.id || index} style={styles.ratingCard}>
                <RatingsDisplay ratings={rating} showComments={true} />
              </View>
            ))}
          </View>
        ) : !averageRatings ? (
          <View style={styles.noRatingsContainer}>
            <Ionicons name="star-outline" size={48} color="#CCC" />
            <Text style={styles.noRatingsText}>No ratings yet</Text>
            <Text style={styles.noRatingsSubText}>
              This bus hasn't received any ratings yet. Ratings will appear here once passengers rate their trips.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  busInfo: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  busNumberText: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  averageRatingsContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statisticItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  statisticItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  statisticLabel: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  statisticValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statisticNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2196F3',
  },
  totalRatingsText: {
    marginTop: 12,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  ratingCard: {
    marginBottom: 12,
  },
  noRatingsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noRatingsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 12,
  },
  noRatingsSubText: {
    fontSize: 13,
    color: '#BBB',
    marginTop: 8,
    textAlign: 'center',
    maxWidth: '80%',
  },
});

export default BusRatingsScreen;
