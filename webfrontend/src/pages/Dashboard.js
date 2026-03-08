import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Bus,
  Activity,
  Gauge,
  Users,
  Search,
  Bell,
  ChevronRight,
  MoreHorizontal,
  ArrowUpDown,
  Filter,
  MessageSquare,
  AlertTriangle,
  CloudRain,
  Sun,
  Navigation
} from 'lucide-react';
import { useFleetOverview, useBuses, useStatistics, useMapData } from '../hooks/useFleet';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom bus icon creator
const createBusIcon = (status) => {
  const color = status === 'online' ? '#10b981' : 'var(--gray-400)';
  const pulseAnimation = status === 'online' ? 'animation: markerPulse 2s infinite;' : '';

  return L.divIcon({
    className: 'custom-bus-marker',
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        background: ${color};
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        ${pulseAnimation}
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M8 6v6m7-6v6M3 17h18m-16 2h14a2 2 0 0 0 2-2V8a5 5 0 0 0-5-5H8a5 5 0 0 0-5 5v9a2 2 0 0 0 2 2z"/>
          <circle cx="7" cy="19" r="2"/>
          <circle cx="17" cy="19" r="2"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
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

function Dashboard() {
  const { data: overview, loading: overviewLoading } = useFleetOverview();
  const { buses, loading: busesLoading } = useBuses();
  const { stats, loading: statsLoading } = useStatistics();
  const { mapData, loading: mapLoading } = useMapData();

  const defaultCenter = [6.9271, 79.8612];
  const defaultZoom = 13;

  const themeColor = '#ea580c';
  const themeLight = '#ffedd5';

  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.65)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.8)',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.02)',
    borderRadius: '16px',
    padding: '24px'
  };

  return (
    <div style={{ padding: '0 2rem 2rem', fontFamily: '"Plus Jakarta Sans", sans-serif', color: '#111827', minHeight: '100vh' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2rem 0', paddingBottom: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#111827', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>Fleet Overview</h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Live fleet tracking with performance events, location updates, and operational status.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Search..."
              style={{
                padding: '10px 12px 10px 36px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: 'rgba(255, 255, 255, 0.8)',
                fontSize: '14px',
                width: '300px',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
            <div style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              fontSize: '11px', color: '#6b7280', background: '#f3f4f6',
              padding: '4px 8px', borderRadius: '4px', border: '1px solid #e5e7eb', fontWeight: 500
            }}>
              ⌘ F
            </div>
          </div>
          <div style={{ position: 'relative', cursor: 'pointer', padding: '8px', background: 'rgba(255,255,255,0.8)', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <Bell size={20} color="#4b5563" />
            <span style={{ position: 'absolute', top: 6, right: 8, width: 8, height: 8, background: themeColor, borderRadius: '50%' }}></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <img src="https://ui-avatars.com/api/?name=Admin+User&background=ffedd5&color=ea580c" alt="Profile" style={{ width: 40, height: 40, borderRadius: '50%' }} />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Total Buses */}
        <div style={glassStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ padding: '8px', background: 'rgba(234, 88, 12, 0.1)', borderRadius: '8px', color: themeColor }}>
              <Bus size={20} />
            </div>
            <span style={{ background: themeLight, color: themeColor, padding: '4px 10px', borderRadius: '20px', fontWeight: 600, fontSize: '12px' }}>Registered</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 600, color: '#111827', marginBottom: '8px', letterSpacing: '-0.5px' }}>{overviewLoading ? '...' : overview?.total_buses || 0}</div>
          <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500 }}>Total Buses</div>
        </div>

        {/* Online Buses */}
        <div style={glassStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', color: '#10b981' }}>
              <Activity size={20} />
            </div>
            <span style={{ background: '#d1fae5', color: '#059669', padding: '4px 10px', borderRadius: '20px', fontWeight: 600, fontSize: '12px' }}>
              +{overview?.total_buses > 0 ? Math.round((overview?.online_buses / overview?.total_buses) * 100) : 0}% Active
            </span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 600, color: '#111827', marginBottom: '8px', letterSpacing: '-0.5px' }}>{overviewLoading ? '...' : overview?.online_buses || 0}</div>
          <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500 }}>Online Buses</div>
        </div>

        {/* Avg Safe Speed */}
        <div style={glassStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', color: '#3b82f6' }}>
              <Gauge size={20} />
            </div>
            <span style={{ background: '#dbeafe', color: '#2563eb', padding: '4px 10px', borderRadius: '20px', fontWeight: 600, fontSize: '12px' }}>Secure</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 600, color: '#111827', marginBottom: '8px', letterSpacing: '-0.5px' }}>
            {overviewLoading ? '...' : overview?.average_speed || 0}
            <span style={{ fontSize: '16px', color: '#6b7280', fontWeight: 500, marginLeft: '4px' }}>km/h</span>
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500 }}>Avg Safe Speed</div>
        </div>

        {/* Total Passengers */}
        <div style={glassStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ padding: '8px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', color: '#f59e0b' }}>
              <Users size={20} />
            </div>
            <span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: '20px', fontWeight: 600, fontSize: '12px' }}>Live Onboard</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 600, color: '#111827', marginBottom: '8px', letterSpacing: '-0.5px' }}>{overviewLoading ? '...' : overview?.total_passengers || 0}</div>
          <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500 }}>Total Passengers</div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>

        {/* Left Column - Active Fleet Feed (Tracker Style) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Tracking Search & Filters */}
          <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="Enter vehicle ID or route..."
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 42px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  background: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '14px',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            <button style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.8)', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#4b5563', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <ArrowUpDown size={18} />
            </button>
            <button style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.8)', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#4b5563', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Filter size={18} />
            </button>
          </div>

          {/* Bus Cards (Shippera Style) */}
          {busesLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Loading fleet...</div>
          ) : buses.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Bus size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
              <div>No buses active currently</div>
            </div>
          ) : (
            buses.slice(0, 3).map((bus, idx) => (
              <div key={bus.vehicle_id} style={{
                background: idx === 0 ? 'rgba(254, 243, 199, 0.3)' : 'rgba(255, 255, 255, 0.65)',
                backdropFilter: 'blur(12px)',
                border: idx === 0 ? `1px solid ${themeColor}` : '1px solid rgba(255, 255, 255, 0.8)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ color: themeColor }}><Bus size={20} /></div>
                    <span style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>#{bus.vehicle_id} - Route {bus.route_id}</span>
                  </div>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: bus.status === 'online' ? '#eab308' : '#6b7280',
                    background: bus.status === 'online' ? '#fef9c3' : '#f3f4f6',
                    padding: '4px 12px',
                    borderRadius: '16px'
                  }}>
                    {bus.status === 'online' ? 'In Transit' : 'Offline'}
                  </span>
                </div>

                {/* Route progress visual */}
                <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', position: 'relative' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', border: `3px solid ${themeColor}`, background: '#fff', zIndex: 2 }}></div>
                  <div style={{ flex: 1, height: '2px', background: bus.status === 'online' ? themeColor : '#e5e7eb', borderStyle: 'dashed', borderWidth: '1px', borderBottom: 'none', borderLeft: 'none', borderRight: 'none' }}></div>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', border: `3px solid ${bus.status === 'online' ? themeColor : '#d1d5db'}`, background: '#fff', zIndex: 2 }}></div>
                  <div style={{ flex: 1, height: '2px', background: '#e5e7eb', borderStyle: 'dashed', borderWidth: '1px', borderBottom: 'none', borderLeft: 'none', borderRight: 'none' }}></div>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', border: '3px solid #d1d5db', background: '#fff', zIndex: 2 }}></div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#6b7280', marginBottom: '24px' }}>
                  <div>Start Terminal</div>
                  <div style={{ textAlign: 'center', color: '#111827', fontWeight: 500 }}>{bus.location_name || 'En Route'}</div>
                  <div>End Terminal</div>
                </div>

                <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src={`https://ui-avatars.com/api/?name=Driver+${bus.vehicle_id.slice(-2)}&background=f3f4f6&color=4b5563`} alt="Driver" style={{ width: 40, height: 40, borderRadius: '50%' }} />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Driver #{bus.vehicle_id.substring(0, 4)}</div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>Speed: {bus.safe_speed} km/h</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={{ padding: '8px', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#4b5563' }}><MessageSquare size={16} /></button>
                    <button style={{ padding: '8px', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#4b5563' }}><AlertTriangle size={16} /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Column - Map & Additional Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Live Map Area */}
          <div style={{
            ...glassStyle,
            padding: 0,
            height: '400px',
            overflow: 'hidden',
            position: 'relative',
            backgroundColor: '#e5e7eb',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ position: 'absolute', top: 20, left: 20, right: 20, display: 'flex', justifyContent: 'space-between', zIndex: 1000, pointerEvents: 'none' }}>
              <div style={{ background: '#fff', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', pointerEvents: 'auto' }}>Live Map</div>
            </div>

            {mapLoading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                Loading Map...
              </div>
            ) : (
              <MapContainer
                center={mapData.length > 0 ? [mapData[0].latitude, mapData[0].longitude] : defaultCenter}
                zoom={defaultZoom}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false} // Hiding the default zoom control to save space or let users double click
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
                      <div style={{ minWidth: '180px', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--glass-border)' }}>
                          <Bus size={16} color="#db046c" />
                          <strong style={{ fontSize: '14px' }}>{bus.vehicle_id}</strong>
                          <span style={{ marginLeft: 'auto', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', background: bus.status === 'online' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)', color: bus.status === 'online' ? '#10b981' : '#f43f5e' }}>
                            {bus.status}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Navigation size={12} color="#9ca3af" />
                            <span style={{ color: '#4b5563' }}>{bus.location_name || 'Unknown'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Gauge size={12} color="#db046c" />
                            <span style={{ color: '#4b5563' }}><strong>{bus.safe_speed || 0}</strong> km/h </span>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}
          </div>

          {/* Road Conditions */}
          <div style={glassStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>Road Conditions</h3>
              <MoreHorizontal size={20} color="#9ca3af" />
            </div>

            <div style={{ height: '200px' }}>
              {overviewLoading ? (
                <div style={{ color: '#9ca3af', textAlign: 'center', paddingTop: '40px' }}>Loading...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Dry Roads', value: overview?.road_conditions?.dry || 0 },
                        { name: 'Wet Roads', value: overview?.road_conditions?.wet || 0 }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill={themeColor} />
                      <Cell fill="#e5e7eb" />
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: themeColor }}></div>
                <span style={{ fontSize: '14px', color: '#4b5563', fontWeight: 500 }}>Dry</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#e5e7eb' }}></div>
                <span style={{ fontSize: '14px', color: '#4b5563', fontWeight: 500 }}>Wet</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;
