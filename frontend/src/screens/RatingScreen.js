import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../api/axiosConfig';

const RatingScreen = ({ route, navigation }) => {
  const { tripId, busId, driverId, busNumber } = route.params || {};

  const [driverRating, setDriverRating] = useState(0);
  const [onTimeToStopRating, setOnTimeToStopRating] = useState(0);
  const [onTimeToDestinationRating, setOnTimeToDestinationRating] = useState(0);
  const [overallRating, setOverallRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showDetailedRating, setShowDetailedRating] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);

  const StarRating = ({ rating, onRate, label }) => {
    return (
      <View style={styles.ratingContainer}>
        <Text style={styles.ratingLabel}>{label}</Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => onRate(star)}
              style={styles.starButton}
            >
              <Ionicons
                name={star <= rating ? 'star' : 'star-outline'}
                size={32}
                color={star <= rating ? '#FFD700' : '#CCCCCC'}
              />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.ratingText}>{rating > 0 ? `${rating}/5` : 'Not rated'}</Text>
      </View>
    );
  };

  const handleSubmitRating = async () => {
    // For simple overall rating, only require overall rating
    if (showDetailedRating) {
      // If showing detailed, require all ratings
      if (!driverRating || !onTimeToStopRating || !onTimeToDestinationRating || !overallRating) {
        Alert.alert('Missing Ratings', 'Please rate all categories before submitting.');
        return;
      }
    } else {
      // Simple mode: only require overall rating
      if (!overallRating) {
        Alert.alert('Missing Rating', 'Please rate your overall experience.');
        return;
      }
    }

    if (!tripId || !busId || !driverId) {
      Alert.alert('Error', 'Missing trip, bus, or driver information.');
      return;
    }

    setLoading(true);
    try {
      const ratingData = {
        tripId,
        busId,
        driverId,
        overallRating,
        comment,
      };

      if (showDetailedRating) {
        ratingData.driverRating = driverRating;
        ratingData.onTimeToStopRating = onTimeToStopRating;
        ratingData.onTimeToDestinationRating = onTimeToDestinationRating;
      }

      const response = await apiClient.post('/api/ratings/submit', ratingData);
      
      setSubmitted(true);
      Alert.alert(
        'Rating Submitted',
        'Thank you for rating! Your feedback helps improve our service.',
        [
          {
            text: 'OK',
            onPress: () => {
                      navigation.reset({
                      index: 0,
                      routes: [{ name: 'MainTabs', params: { screen: 'Routes' } }],
        });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting rating:', error);
      console.error('Rating error response:', {
        status: error.response?.status,
        data: error.response?.data,
      });
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to submit rating. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSkipRating = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs', params: { screen: 'Routes' } }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setShowSkipModal(true)}
            style={styles.backButton}
          >
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rate Your Trip</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Bus Info */}
        {busNumber && (
          <View style={styles.busInfoContainer}>
            <Ionicons name="bus" size={24} color="#2196F3" />
            <Text style={styles.busInfoText}>Bus {busNumber}</Text>
          </View>
        )}

        {/* Rating Sections */}
        <View style={styles.content}>

          {/* Overall Rating - Always Shown */}
          <View>
            <Text style={styles.sectionTitle}>How was your overall experience?</Text>
            <StarRating
              rating={overallRating}
              onRate={setOverallRating}
              label="Overall Experience"
            />
          </View>

          {/* Toggle for Detailed Rating */}
          {overallRating > 0 && !showDetailedRating && (
            <TouchableOpacity
              style={styles.expandButton}
              onPress={() => setShowDetailedRating(true)}
            >
              <Ionicons name="chevron-down" size={20} color="#2196F3" />
              <Text style={styles.expandButtonText}>
                Tell us more details (optional)
              </Text>
            </TouchableOpacity>
          )}

          {/* Detailed Ratings - Shown Only if User Wants */}
          {showDetailedRating && (
            <View style={styles.detailedSection}>
              <View style={styles.detailedHeader}>
                <Text style={styles.sectionTitle}>Detailed Feedback</Text>
                <TouchableOpacity
                  onPress={() => setShowDetailedRating(false)}
                  style={styles.collapseButton}
                >
                  <Ionicons name="chevron-up" size={20} color="#2196F3" />
                </TouchableOpacity>
              </View>

              <StarRating
                rating={driverRating}
                onRate={setDriverRating}
                label="Driver's Driving Quality"
              />

              <StarRating
                rating={onTimeToStopRating}
                onRate={setOnTimeToStopRating}
                label="On-Time to Stop"
              />

              <StarRating
                rating={onTimeToDestinationRating}
                onRate={setOnTimeToDestinationRating}
                label="On-Time to Destination"
              />

              {/* Comment Section */}
              <View style={styles.commentContainer}>
                <Text style={styles.ratingLabel}>Additional Comments (Optional)</Text>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Share your experience or suggestions..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  value={comment}
                  onChangeText={setComment}
                  editable={!loading}
                />
              </View>
            </View>
          )}

          {/* Submit Button - Only show when overall is rated */}
          {overallRating > 0 && (
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmitRating}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {showDetailedRating ? 'Submit Detailed Rating' : 'Submit Rating'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Skip Rating Modal */}
      <Modal
        visible={showSkipModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSkipModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#FF9800" />
            <Text style={styles.modalTitle}>Leave without rating?</Text>
            <Text style={styles.modalMessage}>
              Your feedback helps us improve. Are you sure you want to skip this rating?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setShowSkipModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Keep Rating</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButtonSkip}
                onPress={handleSkipRating}
              >
                <Text style={styles.modalButtonSkipText}>Yes, Skip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  busInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    marginTop: 8,
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 8,
  },
  busInfoText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    color: '#333',
  },
  content: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  ratingContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  starButton: {
    padding: 8,
  },
  ratingText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  expandButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
    marginLeft: 8,
  },
  detailedSection: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  detailedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  collapseButton: {
    padding: 4,
  },
  commentContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginTop: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    textAlignVertical: 'top',
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2196F3',
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  modalButtonSkip: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#F44336',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonSkipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default RatingScreen;
