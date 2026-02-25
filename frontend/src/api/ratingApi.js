import apiClient from './axiosConfig';

/**
 * Rating API utilities
 */

// Submit a rating for a trip
export const submitRating = async (ratingData) => {
  try {
    const response = await apiClient.post('/api/ratings/submit', ratingData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get all ratings for a bus
export const getBusRatings = async (busId) => {
  try {
    const response = await apiClient.get(`/api/ratings/bus/${busId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get average ratings for a bus
export const getBusAverageRatings = async (busId) => {
  try {
    const response = await apiClient.get(`/api/ratings/bus/${busId}/average`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get all ratings for a driver
export const getDriverRatings = async (driverId) => {
  try {
    const response = await apiClient.get(`/api/ratings/driver/${driverId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get average ratings for a driver
export const getDriverAverageRatings = async (driverId) => {
  try {
    const response = await apiClient.get(`/api/ratings/driver/${driverId}/average`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get all ratings by the current passenger
export const getMyRatings = async () => {
  try {
    const response = await apiClient.get('/api/ratings/my-ratings');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get rating for a specific trip
export const getTripRating = async (tripId) => {
  try {
    const response = await apiClient.get(`/api/ratings/trip/${tripId}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null; // No rating found
    }
    throw error.response?.data || error;
  }
};

// Update a rating
export const updateRating = async (ratingId, updatedData) => {
  try {
    const response = await apiClient.put(`/api/ratings/${ratingId}`, updatedData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Delete a rating
export const deleteRating = async (ratingId) => {
  try {
    const response = await apiClient.delete(`/api/ratings/${ratingId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get rating summary for display
export const getRatingSummary = (averageRatings) => {
  if (!averageRatings) return null;

  const overallScore = parseFloat(averageRatings.averageOverallRating);
  let rating = '';
  
  if (overallScore >= 4.5) {
    rating = 'Excellent';
  } else if (overallScore >= 4.0) {
    rating = 'Very Good';
  } else if (overallScore >= 3.5) {
    rating = 'Good';
  } else if (overallScore >= 3.0) {
    rating = 'Fair';
  } else {
    rating = 'Poor';
  }

  return {
    rating,
    score: overallScore,
    totalRatings: averageRatings.totalRatings,
  };
};
