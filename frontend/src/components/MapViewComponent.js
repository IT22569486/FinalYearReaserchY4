import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

const MapViewComponent = ({ buses, passengerLocation, initialRegion, onBusPress, routePath, stops }) => {
  // Use passenger's location for the region if no initial region is provided
  const region = initialRegion || {
    latitude: passengerLocation.latitude,
    longitude: passengerLocation.longitude,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  return (
    <MapView
      style={StyleSheet.absoluteFillObject}
      initialRegion={region}
      showsUserLocation={true}
      followsUserLocation={true}
    >
      {/* Draw the selected route path if it exists */}
      {routePath && routePath.length > 0 && (
        <Polyline
          coordinates={routePath}
          strokeColor="#FF0000" // Red color for the route line
          strokeWidth={4}
        />
      )}

      {/* Render markers for each stop */}
      {stops && stops.map((stop, index) => (
        <Marker
          key={`stop-${index}`}
          coordinate={{ latitude: stop.lat, longitude: stop.lng }}
          title={stop.stopName}
          // Use a lower zIndex to keep stops below bus icons
          zIndex={1}
        >
          {/* Use a custom view for the stop marker */}
          <View style={styles.stopMarker}>
            <View style={styles.stopMarkerDot} />
          </View>
        </Marker>
      ))}

      {/* Render a marker for each bus */}
      {buses.map((bus) =>
        bus.location?.lat && bus.location?.lng ? (
          <Marker
            key={bus.busId}
            coordinate={{
              latitude: bus.location.lat,
              longitude: bus.location.lng,
            }}
            title={`Bus ${bus.busId}`}
            description={`Route: ${bus.routeId} | Status: ${bus.status}`}
            onCalloutPress={() => onBusPress && onBusPress(bus)}
            zIndex={10}
          >
            <Ionicons name="bus" size={30} color="#007AFF" />
          </Marker>
        ) : null
      )}
    </MapView>
  );
};

const styles = StyleSheet.create({
  stopMarker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopMarkerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
  },
});

export default MapViewComponent;