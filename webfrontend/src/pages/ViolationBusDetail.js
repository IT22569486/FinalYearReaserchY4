import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Phone,
  Eye,
  ShieldOff,
  Moon,
  RefreshCw,
  Clock,
  Car,
  Bus,
  ArrowLeft,
  MapPin,
  Filter,
  ChevronDown,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../services/api';
import socketService from '../services/socket';

// Fix leaflet default marker
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const SEVERITY_CONFIG = {
  HIGH: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'High' },
  MEDIUM: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Medium' },
  LOW: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: 'Low' },
  CRITICAL: { color: '#dc2626', bg: 'rgba(220,38,38,0.12)', label: 'Critical' },
  critical: { color: '#dc2626', bg: 'rgba(220,38,38,0.12)', label: 'Critical' },
  danger: { color: '#f97316', bg: 'rgba(249,115,22,0.12)', label: 'Danger' },
  warning: { color: '#eab308', bg: 'rgba(234,179,8,0.12)', label: 'Warning' },
  info: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: 'Info' },
};

function violationIcon(type) {
  const t = (type || '').toUpperCase();
  if (t.includes('PHONE')) return <Phone size={14} />;
  if (t.includes('SLEEP') || t.includes('DROWSY') || t.includes('YAWN')) return <Moon size={14} />;
  if (t.includes('SEATBELT')) return <ShieldOff size={14} />;
  if (t.includes('HEAD')) return <Eye size={14} />;
  if (t.includes('SPEED')) return <Car size={14} />;
  if (t.includes('LANE') || t.includes('OBJECT') || t.includes('DISTANCE')) return <AlertTriangle size={14} />;
  return <AlertTriangle size={14} />;
}

function ViolationBusDetail() {
  const { deviceKey } = useParams();
  const navigate = useNavigate();
  const [violations, setViolations] = useState([]);
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [showFilter, setShowFilter] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [violRes, devRes] = await Promise.all([
        api.get(`/api/violations/device/${encodeURIComponent(deviceKey)}`, { params: { limit: 200 } }),
        api.get(`/api/devices/${encodeURIComponent(deviceKey)}`).catch(() => ({ data: null })),
      ]);
      const dbViolations = Array.isArray(violRes.data) ? violRes.data : [];
      // Merge DB data with any real-time violations we already have locally
      setViolations(prev => {
        if (dbViolations.length === 0 && prev.length > 0) return prev; // keep real-time data if DB empty/failed
        const existingIds = new Set(dbViolations.map(v => v.id));
        const newFromSocket = prev.filter(v => v.id && !existingIds.has(v.id));
        return [...newFromSocket, ...dbViolations];
      });
      setDevice(devRes.data || null);
    } catch (err) {
      console.error('Fetch error:', err);
      // Don't clear existing data — keep real-time violations
    } finally {
      setLoading(false);
    }
  }, [deviceKey]);

  useEffect(() => {
    fetchData();

    const socket = socketService.connect();
    const onNew = (data) => {
      const v = data.violation || data;
      if (v.deviceKey === deviceKey) {
        setViolations(prev => [v, ...prev].slice(0, 300));
      }
    };
    socket.on('newViolation', onNew);

    return () => { socket.off('newViolation', onNew); };
  }, [fetchData, deviceKey]);

  // Derived data
  const busNumber = device?.busNumber || violations[0]?.busNumber || deviceKey;
  const routeNumber = device?.routeNumber || violations[0]?.routeNumber || '';
  const types = [...new Set(violations.map(v => v.type).filter(Boolean))];
  const filtered = typeFilter === 'all' ? violations : violations.filter(v => v.type === typeFilter);

  // Count by type
  const typeCounts = {};
  violations.forEach(v => { if (v.type) typeCounts[v.type] = (typeCounts[v.type] || 0) + 1; });

  // Bus location — try from device health data or last violation with location
  const busLocation = (() => {
    if (device?.lastHealth?.gps) {
      const g = device.lastHealth.gps;
      if (g.lat && g.lng) return { lat: g.lat, lng: g.lng };
    }
    if (device?.location) {
      const loc = device.location;
      if (loc.lat && loc.lng) return loc;
      if (loc.latitude && loc.longitude) return { lat: loc.latitude, lng: loc.longitude };
    }
    // Check violations for location
    for (const v of violations) {
      if (v.location?.lat && v.location?.lng) return v.location;
      if (v.details?.location?.lat && v.details?.location?.lng) return v.details.location;
    }
    return null;
  })();

  // Default map center (Sri Lanka)
  const mapCenter = busLocation ? [busLocation.lat, busLocation.lng] : [6.9271, 79.8612];
  const mapZoom = busLocation ? 14 : 10;

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => navigate('/violations')} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bus size={24} /> {busNumber}
              </h1>
              <p className="page-subtitle">
                {routeNumber ? `Route ${routeNumber} · ` : ''}
                Device: {deviceKey} · {violations.length} violations
              </p>
            </div>
          </div>
          <button onClick={fetchData} className="btn btn-secondary" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats + Map Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: 'var(--spacing-lg)' }}>
        {/* Stats */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="card-header" style={{ marginBottom: '1rem' }}>
            <span className="card-title">Violation Summary</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div style={{ textAlign: 'center', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.1)' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444' }}>{violations.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Total</div>
            </div>
            <div style={{ textAlign: 'center', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(245,158,11,0.1)' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b' }}>
                {violations.filter(v => v.status === 'pending').length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Pending</div>
            </div>
          </div>
          {/* Type breakdown */}
          <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <span key={type}
                onClick={() => setTypeFilter(type === typeFilter ? 'all' : type)}
                style={{
                  padding: '4px 10px', borderRadius: 14, fontSize: '0.72rem', fontWeight: 500, cursor: 'pointer',
                  background: type === typeFilter ? 'var(--primary-500)' : 'rgba(255,255,255,0.06)',
                  color: type === typeFilter ? '#fff' : 'var(--gray-300)',
                  border: '1px solid ' + (type === typeFilter ? 'var(--primary-500)' : 'var(--glass-border)'),
                  display: 'flex', alignItems: 'center', gap: 4,
                  transition: 'all 0.2s',
                }}>
                {violationIcon(type)} {type.replace(/_/g, ' ')} ({count})
              </span>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="card" style={{ padding: '0', overflow: 'hidden', minHeight: 250 }}>
          <div style={{ padding: '0.75rem 1rem 0.5rem', borderBottom: '1px solid var(--glass-border)' }}>
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={14} /> Bus Location
              {!busLocation && <span style={{ fontSize: '0.7rem', color: 'var(--gray-500)', fontWeight: 400 }}> — no GPS data</span>}
            </span>
          </div>
          <div style={{ height: 220 }}>
            <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={false} zoomControl={true}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {busLocation && (
                <Marker position={[busLocation.lat, busLocation.lng]}>
                  <Popup>
                    <strong>{busNumber}</strong><br />
                    Route {routeNumber}<br />
                    {busLocation.lat.toFixed(5)}, {busLocation.lng.toFixed(5)}
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
        </div>
      </div>

      {/* Violation Log Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            {typeFilter !== 'all' ? `${typeFilter.replace(/_/g, ' ')} Violations` : 'Violation Log'} ({filtered.length})
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {typeFilter !== 'all' && (
              <button className="btn btn-secondary" onClick={() => setTypeFilter('all')} style={{ fontSize: '0.75rem', padding: '4px 12px' }}>
                <XCircle size={12} /> Clear
              </button>
            )}
            <div style={{ position: 'relative' }}>
              <button className="btn btn-secondary" onClick={() => setShowFilter(!showFilter)} style={{ fontSize: '0.75rem', padding: '4px 12px' }}>
                <Filter size={12} /> Filter <ChevronDown size={12} />
              </button>
              {showFilter && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 4,
                  background: 'var(--bg-dark-secondary)', border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-lg)', padding: 8, zIndex: 50, minWidth: 160,
                  boxShadow: 'var(--glass-shadow)',
                }}>
                  <div onClick={() => { setTypeFilter('all'); setShowFilter(false); }}
                    style={{ padding: '6px 12px', cursor: 'pointer', borderRadius: 6, fontSize: '0.8rem', color: 'var(--gray-300)' }}>
                    All Types
                  </div>
                  {types.map(t => (
                    <div key={t} onClick={() => { setTypeFilter(t); setShowFilter(false); }}
                      style={{
                        padding: '6px 12px', cursor: 'pointer', borderRadius: 6, fontSize: '0.8rem',
                        color: t === typeFilter ? 'var(--primary-400)' : 'var(--gray-300)',
                        background: t === typeFilter ? 'rgba(59,130,246,0.1)' : 'transparent',
                      }}>
                      {t.replace(/_/g, ' ')}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={48} style={{ opacity: 0.4 }} />
            <p>No violations found</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => {
                  const sev = SEVERITY_CONFIG[v.severity] || SEVERITY_CONFIG.MEDIUM;
                  const created = v.createdAt?._seconds
                    ? new Date(v.createdAt._seconds * 1000)
                    : v.createdAt ? new Date(v.createdAt) : null;
                  return (
                    <tr key={v.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                        <Clock size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        {created ? created.toLocaleString() : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {violationIcon(v.type)}
                          <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>{(v.type || '').replace(/_/g, ' ')}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 10px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 600,
                          color: sev.color, background: sev.bg,
                        }}>{sev.label}</span>
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 10px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 500,
                          background: v.status === 'resolved' ? 'rgba(16,185,129,0.15)' : v.status === 'dismissed' ? 'rgba(107,114,128,0.15)' : 'rgba(245,158,11,0.15)',
                          color: v.status === 'resolved' ? '#10b981' : v.status === 'dismissed' ? '#9ca3af' : '#f59e0b',
                        }}>
                          {v.status || 'pending'}
                        </span>
                      </td>
                      <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--gray-400)' }}>
                        {v.description || v.details?.description || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ViolationBusDetail;
