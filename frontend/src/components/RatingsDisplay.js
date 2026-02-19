import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const RatingsDisplay = ({ ratings, showComments = true }) => {
  if (!ratings) {
    return (
      <View style={styles.container}>
        <Text style={styles.noRatingsText}>No ratings available</Text>
      </View>
    );
  }

  const StarRating = ({ rating, label }) => {
    return (
      <View style={styles.ratingRow}>
        <Text style={styles.ratingLabel}>{label}</Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= rating ? 'star' : 'star-outline'}
              size={16}
              color={star <= rating ? '#FFD700' : '#CCCCCC'}
            />
          ))}
          <Text style={styles.ratingValue}>{rating.toFixed(1)}/5</Text>
        </View>
      </View>
    );
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <StarRating
        rating={ratings.driverRating || 0}
        label="Driver's Driving Quality"
      />
      <StarRating
        rating={ratings.onTimeToStopRating || 0}
        label="On-Time to Stop"
      />
      <StarRating
        rating={ratings.onTimeToDestinationRating || 0}
        label="On-Time to Destination"
      />
      <StarRating
        rating={ratings.overallRating || 0}
        label="Overall Experience"
      />

      {showComments && ratings.comment && (
        <View style={styles.commentSection}>
          <Text style={styles.commentLabel}>Comment:</Text>
          <Text style={styles.commentText}>{ratings.comment}</Text>
        </View>
      )}

      {ratings.createdAt && (
        <Text style={styles.dateText}>
          Rated on {formatDate(ratings.createdAt)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  ratingLabel: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  ratingValue: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    minWidth: 35,
  },
  commentSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  commentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  dateText: {
    marginTop: 12,
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  noRatingsText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default RatingsDisplay;
