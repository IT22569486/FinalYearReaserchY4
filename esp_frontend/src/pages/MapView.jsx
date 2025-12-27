import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  Bus, 
  Gauge, 
  Users, 
  CloudRain, 
  Sun,
  Navigation,
  RefreshCw
} from 'lucide-react';
import { useMapData } from '../hooks/useFleet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom bus icon creator
const createBusIcon = (status) => {
  const color = status === 'online' ? '#10b981' : '#6b7280';
  const pulseAnimation = status === 'online' ? 'animation: markerPulse 2s infinite;' : '';
  
  return L.divIcon({
    className: 'custom-bus-marker',
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        background: ${color};
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        ${pulseAnimation}
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M8 6v6m7-6v6M3 17h18m-16 2h14a2 2 0 0 0 2-2V8a5 5 0 0 0-5-5H8a5 5 0 0 0-5 5v9a2 2 0 0 0 2 2z"/>
          <circle cx="7" cy="19" r="2"/>
          <circle cx="17" cy="19" r="2"/>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });
};

// Component to fit map bounds to markers
function MapBoundsUpdater({ buses }) {
  const map = useMap();
  
  useEffect(() => {
    if (buses.length > 0) {
      const bounds = L.latLngBounds(
        buses.map(bus => [bus.latitude, bus.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [buses, map]);
  
  return null;
}

function MapView() {
  const { mapData, loading, refetch } = useMapData();
  
  // Default center (Colombo, Sri Lanka)
  const defaultCenter = [6.9271, 79.8612];
  const defaultZoom = 13;

  const onlineBuses = mapData.filter(b => b.status === 'online');
  const offlineBuses = mapData.filter(b => b.status === 'offline');

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">Live Map</h1>
            <p className="page-subtitle">
              Real-time location tracking of all buses
            </p>
          </div>
          <button onClick={refetch} className="btn btn-secondary">
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Map Stats */}
      <div className="stats-grid" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div className="card" style={{ padding: 'var(--spacing-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              background: 'rgba(16, 185, 129, 0.2)', 
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ 
                width: '12px', 
                height: '12px', 
                background: '#10b981', 
                borderRadius: '50%',
                animation: 'pulse 2s infinite'
              }}></span>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{onlineBuses.length}</div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase' }}>Online Buses</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 'var(--spacing-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              background: 'rgba(107, 114, 128, 0.2)', 
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ 
                width: '12px', 
                height: '12px', 
                background: '#6b7280', 
                borderRadius: '50%'
              }}></span>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6b7280' }}>{offlineBuses.length}</div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase' }}>Offline Buses</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 'var(--spacing-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Bus size={24} color="#3b82f6" />
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{mapData.length}</div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase' }}>Total on Map</div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="loading" style={{ height: '500px' }}>
            <div className="spinner"></div>
          </div>
        ) : (
          <div className="map-container" style={{ height: '600px' }}>
            <MapContainer
              center={mapData.length > 0 ? [mapData[0].latitude, mapData[0].longitude] : defaultCenter}
              zoom={defaultZoom}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              
              {mapData.length > 0 && <MapBoundsUpdater buses={mapData} />}
              
              {mapData.map((bus) => (
                <Marker
                  key={bus.vehicle_id}
                  position={[bus.latitude, bus.longitude]}
                  icon={createBusIcon(bus.status)}
                >
                  <Popup>
                    <div style={{ 
                      minWidth: '200px',
                      fontFamily: 'Inter, sans-serif'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        marginBottom: '0.75rem',
                        paddingBottom: '0.75rem',
                        borderBottom: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        <Bus size={18} color="#3b82f6" />
                        <strong style={{ fontSize: '1rem' }}>{bus.vehicle_id}</strong>
                        <span 
                          style={{ 
                            marginLeft: 'auto',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '9999px',
                            fontSize: '0.625rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            background: bus.status === 'online' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                            color: bus.status === 'online' ? '#10b981' : '#f43f5e'
                          }}
                        >
                          {bus.status}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Navigation size={14} color="#9ca3af" />
                          <span style={{ color: '#e5e7eb' }}>{bus.location_name || 'Unknown'}</span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Gauge size={14} color="#3b82f6" />
                          <span style={{ color: '#e5e7eb' }}>
                            <strong>{bus.safe_speed || 0}</strong> km/h safe speed
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Users size={14} color="#f59e0b" />
                          <span style={{ color: '#e5e7eb' }}>{bus.passenger_count || 0} passengers</span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {bus.road_condition === 'Wet' ? (
                            <CloudRain size={14} color="#60a5fa" />
                          ) : (
                            <Sun size={14} color="#fbbf24" />
                          )}
                          <span style={{ color: '#e5e7eb' }}>{bus.road_condition || 'Dry'} road</span>
                        </div>
                      </div>
                      
                      <div style={{ 
                        marginTop: '0.75rem',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                        fontSize: '0.75rem',
                        color: '#9ca3af'
                      }}>
                        {bus.direction?.replace(/_/g, ' → ')}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="card" style={{ marginTop: 'var(--spacing-lg)' }}>
        <div className="card-header">
          <span className="card-title">Map Legend</span>
        </div>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ 
              width: '24px', 
              height: '24px', 
              background: '#10b981', 
              borderRadius: '50%', 
              border: '2px solid white' 
            }}></div>
            <span style={{ color: '#9ca3af' }}>Online Bus</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ 
              width: '24px', 
              height: '24px', 
              background: '#6b7280', 
              borderRadius: '50%', 
              border: '2px solid white' 
            }}></div>
            <span style={{ color: '#9ca3af' }}>Offline Bus</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MapView;
