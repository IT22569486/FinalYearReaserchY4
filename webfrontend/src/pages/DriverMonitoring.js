import { useState, useEffect, useCallback } from 'react';
import {
  Eye,
  AlertTriangle,
  Phone,
  ShieldOff,
  Moon,
  Activity,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { dmsService } from '../services/api';
import socketService from '../services/socket';

// Severity colour map
const SEVERITY_MAP = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: 'Critical' },
  danger: { color: '#f97316', bg: 'rgba(249,115,22,0.15)', label: 'Danger' },
  warning: { color: '#eab308', bg: 'rgba(234,179,8,0.15)', label: 'Warning' },
  info: { color: '#db046c', bg: 'rgba(219,4,108,0.15)', label: 'Info' },
};

const DEVICES_PER_PAGE = 6;
const EVENTS_PER_PAGE = 10;

// Icon by state
function stateIcon(state) {
  const s = (state || '').toUpperCase();
  if (s.includes('PHONE')) return <Phone size={18} />;
  if (s.includes('SLEEP')) return <Moon size={18} />;
  if (s.includes('SEATBELT')) return <ShieldOff size={18} />;
  if (s.includes('DROWSY') || s.includes('YAWN')) return <Eye size={18} />;
  if (s.includes('ALERT')) return <CheckCircle size={18} />;
  return <AlertTriangle size={18} />;
}

function severityBadge(severity) {
  const s = SEVERITY_MAP[severity] || SEVERITY_MAP.info;
  return (
    <span style={{
      padding: '2px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600,
      color: s.color, background: s.bg
    }}>
      {s.label}
    </span>
  );
}

/** Render page number buttons with ellipsis for large page counts */
function renderPageNumbers(currentPage, totalPages, onPageChange) {
  const pages = [];
  const delta = 2;
  const left = Math.max(2, currentPage - delta);
  const right = Math.min(totalPages - 1, currentPage + delta);

  pages.push(
    <button key={1} className={`pagination-btn${currentPage === 1 ? ' active' : ''}`} onClick={() => onPageChange(1)}>1</button>
  );

  if (left > 2) pages.push(<span key="el" className="pagination-ellipsis">…</span>);

  for (let i = left; i <= right; i++) {
    pages.push(
      <button key={i} className={`pagination-btn${currentPage === i ? ' active' : ''}`} onClick={() => onPageChange(i)}>{i}</button>
    );
  }

  if (right < totalPages - 1) pages.push(<span key="er" className="pagination-ellipsis">…</span>);

  if (totalPages > 1) {
    pages.push(
      <button key={totalPages} className={`pagination-btn${currentPage === totalPages ? ' active' : ''}`} onClick={() => onPageChange(totalPages)}>{totalPages}</button>
    );
  }

  return pages;
}

function DriverMonitoring() {
  const [states, setStates] = useState([]);
  const [totalDevices, setTotalDevices] = useState(0);
  const [devicePages, setDevicePages] = useState(1);
  const [events, setEvents] = useState([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [eventPages, setEventPages] = useState(1);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [devicePage, setDevicePage] = useState(1);
  const [eventPage, setEventPage] = useState(1);

  // Fetch data with current pagination
  const fetchData = useCallback(async (devPage = 1, evPage = 1) => {
    setLoading(true);
    try {
      const [stRes, evRes, statsRes] = await Promise.all([
        dmsService.getStatus(devPage, DEVICES_PER_PAGE),
        dmsService.getEvents(null, EVENTS_PER_PAGE, evPage),
        dmsService.getStatistics(24),
      ]);
      // States (paginated response)
      setStates(stRes.data || []);
      setTotalDevices(stRes.total || 0);
      setDevicePages(stRes.totalPages || 1);
      setDevicePage(stRes.page || 1);

      // Events (paginated response)
      setEvents(evRes.data || []);
      setTotalEvents(evRes.total || 0);
      setEventPages(evRes.totalPages || 1);
      setEventPage(evRes.page || 1);

      setStats(statsRes.data || null);
    } catch (err) {
      console.error('DMS fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(1, 1);
    const interval = setInterval(() => fetchData(devicePage, eventPage), 15000);

    // Socket listeners
    const socket = socketService.connect();
    const onStateUpdate = (data) => {
      // Re-fetch current device page on state update
      fetchData(devicePage, eventPage);
    };
    const onEvent = (data) => {
      // Re-fetch current event page on new event
      fetchData(devicePage, eventPage);
    };

    socket.on('dmsStateUpdate', onStateUpdate);
    socket.on('dmsEvent', onEvent);

    return () => {
      clearInterval(interval);
      socket.off('dmsStateUpdate', onStateUpdate);
      socket.off('dmsEvent', onEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData]);

  // Device page change handler
  const handleDevicePageChange = (page) => {
    setDevicePage(page);
    fetchData(page, eventPage);
  };

  // Event page change handler
  const handleEventPageChange = (page) => {
    setEventPage(page);
    fetchData(devicePage, page);
  };

  // ---- Render ----
  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--gray-100)' }}>
            <Eye style={{ verticalAlign: 'middle', marginRight: 8 }} size={22} />
            Driver Monitoring System
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--gray-400)', fontSize: '0.875rem' }}>
            Real-time drowsiness, distraction &amp; safety tracking
          </p>
        </div>
        <button
          onClick={() => fetchData(devicePage, eventPage)}
          disabled={loading}
          style={{ background: 'var(--bg-dark-secondary)', border: '1px solid #334155', borderRadius: 8, padding: '8px 16px', color: 'var(--gray-300)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Statistics cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <StatCard label="Total Events (24h)" value={stats.total} icon={<Activity size={20} />} color="#db046c" />
          <StatCard label="Critical" value={stats.bySeverity?.critical || 0} icon={<XCircle size={20} />} color="#ef4444" />
          <StatCard label="Warnings" value={stats.bySeverity?.warning || 0} icon={<AlertTriangle size={20} />} color="#eab308" />
          <StatCard label="Danger" value={stats.bySeverity?.danger || 0} icon={<Moon size={20} />} color="#f97316" />
        </div>
      )}

      {/* Live device states */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', color: 'var(--gray-100)', marginBottom: '0.75rem' }}>Live Device States ({totalDevices})</h2>
        {states.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--gray-500)', padding: '2rem' }}>
            No devices reporting DMS data yet.
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
              {states.map(s => (
                <DeviceStateCard key={s.device_key || s.id} data={s} />
              ))}
            </div>

            {/* Device Pagination */}
            {devicePages > 1 && (
              <div className="pagination">
                <button className="pagination-btn" disabled={devicePage <= 1} onClick={() => handleDevicePageChange(devicePage - 1)}>
                  <ChevronLeft size={16} />
                </button>
                {renderPageNumbers(devicePage, devicePages, handleDevicePageChange)}
                <button className="pagination-btn" disabled={devicePage >= devicePages} onClick={() => handleDevicePageChange(devicePage + 1)}>
                  <ChevronRight size={16} />
                </button>
                <span className="pagination-info">
                  Page {devicePage} of {devicePages} ({totalDevices} devices)
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Recent events */}
      <div>
        <h2 style={{ fontSize: '1.1rem', color: 'var(--gray-100)', marginBottom: '0.75rem' }}>Recent Alerts ({totalEvents})</h2>
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: 'var(--gray-400)', textAlign: 'left' }}>
                <th style={thStyle}>Time</th>
                <th style={thStyle}>Device</th>
                <th style={thStyle}>Event</th>
                <th style={thStyle}>Severity</th>
                <th style={thStyle}>Details</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr><td colSpan={5} style={{ ...tdStyle, color: 'var(--gray-500)', textAlign: 'center' }}>No recent events</td></tr>
              ) : events.map((ev, i) => (
                <tr key={ev.id || i} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={tdStyle}>
                    <Clock size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    {new Date(ev.timestamp || ev.createdAt).toLocaleTimeString()}
                  </td>
                  <td style={tdStyle}>{ev.device_key}</td>
                  <td style={tdStyle}>{stateIcon(ev.type)} {ev.type}</td>
                  <td style={tdStyle}>{severityBadge(ev.severity)}</td>
                  <td style={{ ...tdStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ev.details ? JSON.stringify(ev.details) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Event Pagination */}
          {eventPages > 1 && (
            <div className="pagination">
              <button className="pagination-btn" disabled={eventPage <= 1} onClick={() => handleEventPageChange(eventPage - 1)}>
                <ChevronLeft size={16} />
              </button>
              {renderPageNumbers(eventPage, eventPages, handleEventPageChange)}
              <button className="pagination-btn" disabled={eventPage >= eventPages} onClick={() => handleEventPageChange(eventPage + 1)}>
                <ChevronRight size={16} />
              </button>
              <span className="pagination-info">
                Page {eventPage} of {eventPages} ({totalEvents} events)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Sub-components ----

function StatCard({ label, value, icon, color }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }}>
      <div style={{ color, opacity: 0.85 }}>{icon}</div>
      <div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--gray-100)' }}>{value}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{label}</div>
      </div>
    </div>
  );
}

function DeviceStateCard({ data }) {
  const sev = (data.state || '').includes('ALERT') ? 'info'
    : (data.state || '').includes('PHONE') || (data.state || '').includes('SLEEP') || (data.state || '').includes('HEAD_TURNED') || (data.state || '').includes('SEATBELT') ? 'critical'
      : (data.state || '').includes('DROWSY') || (data.state || '').includes('YAWN') || (data.state || '').includes('HANDS') ? 'warning'
        : 'info';
  const s = SEVERITY_MAP[sev];

  return (
    <div className="card" style={{ borderLeft: `3px solid ${s.color}`, padding: '1rem 1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--gray-100)' }}>{data.device_key}</span>
        {severityBadge(sev)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: s.color, fontWeight: 600, fontSize: '1.1rem', marginBottom: 8 }}>
        {stateIcon(data.state)} {data.state}
      </div>
      {data.details && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: '0.78rem', color: 'var(--gray-400)' }}>
          {data.details.ear != null && <span>EAR: {data.details.ear}</span>}
          {data.details.mar != null && <span>MAR: {data.details.mar}</span>}
          {data.details.yaw != null && <span>Yaw: {data.details.yaw}°</span>}
          {data.details.hands != null && <span>Hands: {data.details.hands}</span>}
          {data.details.phone != null && <span>Phone: {data.details.phone ? 'Yes' : 'No'}</span>}
          {data.details.seatbelt != null && <span>Seatbelt: {data.details.seatbelt ? 'Yes' : 'No'}</span>}
        </div>
      )}
      {data.timestamp && (
        <div style={{ marginTop: 8, fontSize: '0.7rem', color: '#475569' }}>
          Updated: {new Date(data.timestamp).toLocaleString()}
        </div>
      )}
    </div>
  );
}

const thStyle = { padding: '8px 12px', fontWeight: 600 };
const tdStyle = { padding: '8px 12px', color: 'var(--gray-300)' };

export default DriverMonitoring;
