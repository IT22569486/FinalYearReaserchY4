import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, Polyline, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

const MapViewComponent = ({ buses, passengerLocation, initialRegion, onBusPress, routePath, stops, routes = [] }) => {
  const mapRef = useRef(null);

  // Use passenger's location for the region if no initial region is provided
  const region = initialRegion || {
    latitude: passengerLocation.latitude,
    longitude: passengerLocation.longitude,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  useEffect(() => {
    if (mapRef.current && routePath && routePath.length > 0) {
      mapRef.current.fitToCoordinates(routePath, {
        edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
        animated: true,
      });
    }
  }, [routePath]);

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFillObject}
      initialRegion={region}
      showsUserLocation={true}
      provider="google"
      // followsUserLocation={true}
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
          zIndex={50}
        >
          <View style={styles.stopMarker}>
            <View style={styles.stopMarkerDot} />
          </View>
          <Callout tooltip>
            <View style={styles.stopCallout}>
              <Text style={styles.stopName}>{stop.stopName}</Text>
            </View>
          </Callout>
        </Marker>
      ))}

      {/* Render a marker for each bus */}
      {buses.map((bus) => {
        const route = routes.find(r => r.id === bus.routeId);
        const routeName = route ? route.name : 'Unknown Route';
        return (
          <Marker
            key={bus.busId}
            coordinate={{
              latitude: bus.location.lat,
              longitude: bus.location.lng,
            }}
            title={`Bus ${bus.busId}`}
            onPress={() => onBusPress && onBusPress(bus)}
            zIndex={150}
          >
            <Ionicons name="bus" size={30} color="#007AFF" />
            <Callout tooltip>
              <View style={styles.calloutView}>
                <Text style={styles.calloutTitle}>{routeName}</Text>
                <Text style={styles.calloutBusId}>{`Bus ${bus.busId}`}</Text>
                <Text style={styles.calloutText}>{`Status: ${bus.status}`}</Text>
                <Text style={styles.calloutText}>{`Location: ${bus.location.lat}, ${bus.location.lng}`}</Text>
                <Text style={styles.calloutText}>{`Current Load: ${bus.occupancy}/${bus.capacity}`}</Text>
              </View>
            </Callout>
          </Marker>
        );
      })}
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
  calloutView: {
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 10,
    borderColor: '#ccc',
    borderWidth: 1,
    width: 200,
  },
  calloutText: {
    fontSize: 14,
    marginBottom: 2,
  },
  calloutTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  calloutBusId: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 5,
    color: 'gray',
  },
});

export default MapViewComponent;