// Utilities for tracking bus progress and stop proximity.

export const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const findStopByName = (stops, stopName) => {
  if (!stops || !stopName) return null;
  return stops.find((stop) => stop.stopName === stopName) || null;
};

export const getClosestStopIndex = (stops, location, maxDistanceKm = 0.2) => {
  if (!stops || !stops.length || !location) return -1;

  let closestIndex = -1;
  let minDistance = Infinity;

  stops.forEach((stop, index) => {
    const distance = getDistanceKm(
      location.latitude,
      location.longitude,
      stop.lat,
      stop.lng
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
    }
  });

  if (minDistance > maxDistanceKm) return -1;
  return closestIndex;
};

export const getNextStopIndex = (currentIndex, direction, totalStops) => {
  if (currentIndex === -1 || totalStops === 0) return -1;
  if (direction === 'reverse') {
    return currentIndex > 0 ? currentIndex - 1 : -1;
  }
  return currentIndex < totalStops - 1 ? currentIndex + 1 : -1;
};
