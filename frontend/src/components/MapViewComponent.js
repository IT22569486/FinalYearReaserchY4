import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, Polyline, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

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

      {passengerOriginStop && (
        <Marker
          coordinate={{
            latitude: passengerOriginStop.lat,
            longitude: passengerOriginStop.lng,
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
      )}

      {passengerDestinationStop && (
        <Marker
          coordinate={{
            latitude: passengerDestinationStop.lat,
            longitude: passengerDestinationStop.lng,
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
      {buses.map((bus, idx) => {
        // Support both {lat,lng} and {latitude,longitude} location formats
        const loc = bus.location || {};
        const lat = parseFloat(loc.latitude ?? loc.lat ?? bus.latitude ?? '');
        const lng = parseFloat(loc.longitude ?? loc.lng ?? bus.longitude ?? '');
        if (isNaN(lat) || isNaN(lng)) return null; // skip buses with no/bad location
        const route = routes.find(r => r.id === bus.routeId);
        const routeName = route ? route.name : 'Unknown Route';
        const arrivalTime = passengerArrivalTimes[bus.busId];
        const passengerCount = passengerCounts[bus.busId];
        const isLive = !!bus.isLive;
        
        return (
          <Marker
            key={bus.busId || bus.bus_id}
            coordinate={{ latitude: lat, longitude: lng }}
            title={`Bus ${bus.busId || bus.bus_id}`}
            zIndex={150}
          >
            {/* Bus icon with optional LIVE badge */}
            <View style={styles.busMarkerContainer}>
              <Ionicons
                name="bus"
                size={30}
                color={isLive ? '#00C853' : '#007AFF'}
              />
              {isLive && (
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
              )}
            </View>
            <Callout 
              tooltip
              onPress={() => {
                if (selectedOrigin && selectedDestination && onBusPress) {
                  onBusPress(bus);
                }
              }}
            >
              <View style={styles.calloutView}>
                <View style={styles.calloutHeader}>
                  <Text style={styles.calloutTitle}>{routeName}</Text>
                  {isLive && (
                    <View style={styles.liveCalloutBadge}>
                      <Text style={styles.liveCalloutText}>● LIVE</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.calloutBusId}>{`Bus ${bus.busId || bus.bus_id}`}</Text>
                <Text style={styles.calloutText}>{`Status: ${bus.status || 'online'}`}</Text>
                {isLive ? (
                  <>
                    <Text style={styles.calloutText}>{`Speed: ${Math.round(bus.speed || 0)} km/h`}</Text>
                    <Text style={styles.calloutText}>{`Passengers: ${bus.passenger_count ?? bus.occupancy ?? 0}`}</Text>
                    {bus.total_weight > 0 && (
                      <Text style={styles.calloutText}>{`Weight: ${Math.round(bus.total_weight)} kg`}</Text>
                    )}
                  </>
                ) : (
                  <Text style={styles.calloutText}>{`Current Load: ${bus.occupancy}/${bus.capacity}`}</Text>
                )}
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
  busMarkerContainer: {
    alignItems: 'center',
  },
  liveBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#00C853',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  calloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  liveCalloutBadge: {
    backgroundColor: '#00C853',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  liveCalloutText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default MapViewComponent;