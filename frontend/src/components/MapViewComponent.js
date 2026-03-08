import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, Polyline, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

const parseCoordinate = (value) => {
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(parsed) ? parsed : null;
};

const MapViewComponent = ({
  buses,
  passengerLocation,
  initialRegion,
  onBusPress,
  routePath,
  stops,
  routes = [],
  passengerOriginStop,
  passengerDestinationStop,
  selectedOrigin,
  selectedDestination,
  passengerArrivalTimes = {},
  passengerCounts = {},
  autoFitRoute = true,
}) => {
  const mapRef = useRef(null);

  // Use passenger's location for the region if no initial region is provided
  const region = initialRegion || (passengerLocation ? {
    latitude: passengerLocation.latitude,
    longitude: passengerLocation.longitude,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  } : {
    latitude: 6.9271,
    longitude: 79.8612,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  useEffect(() => {
    if (autoFitRoute && mapRef.current && routePath && routePath.length > 0) {
      mapRef.current.fitToCoordinates(routePath, {
        edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
        animated: true,
      });
    }
  }, [routePath, autoFitRoute]);

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFillObject}
      initialRegion={region}
      showsUserLocation={true}
      provider="google"
      scrollEnabled={true}
      zoomEnabled={true}
      rotateEnabled={true}
      pitchEnabled={true}
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

      {passengerOriginStop && (
        (() => {
          const originLat = parseCoordinate(passengerOriginStop.lat);
          const originLng = parseCoordinate(passengerOriginStop.lng);
          if (originLat == null || originLng == null) return null;
          return (
            <Marker
              coordinate={{
                latitude: originLat,
                longitude: originLng,
              }}
              title={`Origin: ${passengerOriginStop.stopName}`}
              zIndex={120}
            >
              <View style={styles.originMarker}>
                <Ionicons name="location" size={18} color="#FFFFFF" />
              </View>
              <Callout tooltip>
                <View style={styles.stopCallout}>
                  <Text style={styles.stopName}>Origin: {passengerOriginStop.stopName}</Text>
                </View>
              </Callout>
            </Marker>
          );
        })()
      )}

      {passengerDestinationStop && (
        (() => {
          const destinationLat = parseCoordinate(passengerDestinationStop.lat);
          const destinationLng = parseCoordinate(passengerDestinationStop.lng);
          if (destinationLat == null || destinationLng == null) return null;
          return (
            <Marker
              coordinate={{
                latitude: destinationLat,
                longitude: destinationLng,
              }}
              title={`Destination: ${passengerDestinationStop.stopName}`}
              zIndex={120}
            >
              <View style={styles.destinationMarker}>
                <Ionicons name="flag" size={18} color="#FFFFFF" />
              </View>
              <Callout tooltip>
                <View style={styles.stopCallout}>
                  <Text style={styles.stopName}>Destination: {passengerDestinationStop.stopName}</Text>
                </View>
              </Callout>
            </Marker>
          );
        })()
      )}

      {/* Render markers for each stop */}
      {stops && stops.map((stop, index) => (
        (() => {
          const stopLat = parseCoordinate(stop.lat);
          const stopLng = parseCoordinate(stop.lng);
          if (stopLat == null || stopLng == null) return null;
          return (
            <Marker
              key={`stop-${index}`}
              coordinate={{ latitude: stopLat, longitude: stopLng }}
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
          );
        })()
      ))}

      {/* Render a marker for each bus */}
      {buses.map((bus) => {
        // Support both {lat,lng} and {latitude,longitude} location formats
        const loc = bus.location || {};
        const lat = parseCoordinate(loc.latitude ?? loc.lat ?? bus.latitude);
        const lng = parseCoordinate(loc.longitude ?? loc.lng ?? bus.longitude);
        if (lat == null || lng == null) return null; // skip buses with no location
        const route = routes.find(r => r.id === bus.routeId);
        const routeName = route ? route.name : 'Unknown Route';
        const arrivalTime = passengerArrivalTimes[bus.busId];
        const passengerCount = passengerCounts[bus.busId];
        
        return (
          <Marker
            key={bus.busId}
            coordinate={{ latitude: lat, longitude: lng }}
            title={`Bus ${bus.busId}`}
            zIndex={150}
          >
            <Ionicons name="bus" size={30} color="#007AFF" />
            <Callout 
              tooltip
              onPress={() => {
                if (selectedOrigin && selectedDestination && onBusPress) {
                  onBusPress(bus);
                }
              }}
            >
              <View style={styles.calloutView}>
                <Text style={styles.calloutTitle}>{routeName}</Text>
                <Text style={styles.calloutBusId}>{`Bus ${bus.busId}`}</Text>
                <Text style={styles.calloutText}>{`Status: ${bus.status}`}</Text>
                <Text style={styles.calloutText}>{`Current Load: ${bus.occupancy}/${bus.capacity}`}</Text>
                {passengerCount !== undefined && (
                  <Text style={styles.calloutText}>{`Est. Passengers at Origin: ${passengerCount}`}</Text>
                )}
                {arrivalTime !== undefined && (
                  <Text style={styles.calloutText}>{`Est. Arrival Time: ${Math.round(arrivalTime)} min`}</Text>
                )}
                {selectedOrigin && selectedDestination && (
                  <View style={styles.selectButton}>
                    <Text style={styles.selectButtonText}>Tap to Select Bus</Text>
                  </View>
                )}
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
  originMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  destinationMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6A1B9A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  stopCallout: {
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  stopName: {
    fontSize: 13,
    color: '#333',
  },
  calloutView: {
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 10,
    borderColor: '#ccc',
    borderWidth: 1,
    width: 220,
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
  selectButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  selectButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default MapViewComponent;