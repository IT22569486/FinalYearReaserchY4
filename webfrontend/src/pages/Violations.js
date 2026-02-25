import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  Phone, 
  Eye,
  Shield, 
  ShieldOff,
  Moon,
  RefreshCw,
  Clock,
  Car,
  Bus,
  ChevronRight,
  MapPin,
  Zap
} from 'lucide-react';
import api from '../services/api';
import socketService from '../services/socket';

const SEVERITY_CONFIG = { // eslint-disable-line no-unused-vars
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
  if (t.includes('PHONE')) return <Phone size={16} />;
  if (t.includes('SLEEP') || t.includes('DROWSY') || t.includes('YAWN')) return <Moon size={16} />;
  if (t.includes('SEATBELT')) return <ShieldOff size={16} />;
  if (t.includes('HEAD')) return <Eye size={16} />;
  if (t.includes('SPEED')) return <Car size={16} />;
  if (t.includes('LANE') || t.includes('OBJECT') || t.includes('DISTANCE')) return <AlertTriangle size={16} />;
  return <AlertTriangle size={16} />;
}

/**
 * Get color intensity for bus card based on its violation ranking among all buses.
 * The bus with the most violations → deep red, fewer → lighter.
 */
function getBusCardColor(totalViolations, maxViolations) {
  if (maxViolations === 0) return { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', text: '#10b981' };
  const ratio = totalViolations / maxViolations;
  if (ratio >= 0.75) return { bg: 'rgba(220,38,38,0.18)', border: 'rgba(220,38,38,0.5)', text: '#ef4444' };
  if (ratio >= 0.5) return { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', text: '#f87171' };
  if (ratio >= 0.25) return { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', text: '#f59e0b' };
  return { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)', text: '#60a5fa' };
}

function Violations() {
  const [busSummary, setBusSummary] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, statsRes] = await Promise.all([
        api.get('/api/violations/summary-by-bus'),
        api.get('/api/violations/stats'),
      ]);
      setBusSummary(Array.isArray(summaryRes.data) ? summaryRes.data : []);
      setStats(statsRes.data || null);
    } catch (err) {
      console.error('Violations fetch error:', err);
      // Don't clear existing data on error — keep what we have from real-time
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Real-time updates via Socket.IO — locally merge data instead of re-fetching DB
    const socket = socketService.connect();

    const onNewViolation = (data) => {
      const v = data.violation || data;
      if (!v || !v.type) return;

      const busKey = v.busNumber || v.deviceKey || 'UNKNOWN';

      // Update busSummary locally
      setBusSummary(prev => {
        const existing = prev.find(b => (b.busNumber === busKey) || (b.deviceKey === v.deviceKey));
        let updated;
        if (existing) {
          updated = prev.map(b => {
            if ((b.busNumber === busKey) || (b.deviceKey === v.deviceKey)) {
              const newByType = { ...b.byType };
              newByType[v.type] = (newByType[v.type] || 0) + 1;
              const sev = v.severity || 'MEDIUM';
              const newBySev = { ...b.bySeverity };
              newBySev[sev] = (newBySev[sev] || 0) + 1;
              return {
                ...b,
                totalViolations: b.totalViolations + 1,
                todayCount: b.todayCount + 1,
                pendingCount: (v.status === 'pending' ? b.pendingCount + 1 : b.pendingCount),
                byType: newByType,
                bySeverity: newBySev,
                latestViolation: { id: v.id, type: v.type, severity: sev, createdAt: v.createdAt },
              };
            }
            return b;
          });
        } else {
          // New bus entry
          const sev = v.severity || 'MEDIUM';
          updated = [{
            busNumber: v.busNumber || 'UNKNOWN',
            routeNumber: v.routeNumber || '',
            deviceKey: v.deviceKey || '',
            totalViolations: 1,
            todayCount: 1,
            pendingCount: v.status === 'pending' ? 1 : 0,
            byType: { [v.type]: 1 },
            bySeverity: { [sev]: 1 },
            latestViolation: { id: v.id, type: v.type, severity: sev, createdAt: v.createdAt },
            latestTimestamp: Date.now() / 1000,
          }, ...prev];
        }
        return updated.sort((a, b) => b.totalViolations - a.totalViolations);
      });

      // Update stats locally
      setStats(prev => {
        if (!prev) prev = { total: 0, today: 0, byType: {}, byStatus: {} };
        const newByType = { ...prev.byType };
        newByType[v.type] = (newByType[v.type] || 0) + 1;
        const newByStatus = { ...prev.byStatus };
        const st = v.status || 'pending';
        newByStatus[st] = (newByStatus[st] || 0) + 1;
        return {
          ...prev,
          total: prev.total + 1,
          today: prev.today + 1,
          byType: newByType,
          byStatus: newByStatus,
        };
      });
    };

    const onViolationUpdated = (data) => {
      // A violation's status changed — just re-fetch (rare event)
      fetchData();
    };
    const onViolationDeleted = () => fetchData();

    socket.on('newViolation', onNewViolation);
    socket.on('violationUpdated', onViolationUpdated);
    socket.on('violationDeleted', onViolationDeleted);

    return () => {
      socket.off('newViolation', onNewViolation);
      socket.off('violationUpdated', onViolationUpdated);
      socket.off('violationDeleted', onViolationDeleted);
    };
  }, [fetchData]);

  // Stat counts
  const totalCount = stats?.total || 0;
  const todayCount = stats?.today || 0;
  const statusCounts = stats?.byStatus || {};
  const typeCounts = stats?.byType || {};
  const maxViolations = busSummary.length > 0 ? busSummary[0].totalViolations : 0;

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">Violations &amp; Alerts</h1>
            <p className="page-subtitle">
              All violations from database — grouped by bus. Click a bus to see details.
            </p>
          </div>
          <button onClick={fetchData} className="btn btn-secondary" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="card-header">
            <span className="card-title">Total Violations</span>
            <div className="card-icon danger"><AlertTriangle size={20} color="white" /></div>
          </div>
          <div className="stat-value">{totalCount}</div>
          <div className="stat-label">All Time Records</div>
        </div>

        <div className="card stat-card">
          <div className="card-header">
            <span className="card-title">Today</span>
            <div className="card-icon warning"><Zap size={20} color="white" /></div>
          </div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>{todayCount}</div>
          <div className="stat-label">Violations Today</div>
        </div>

        <div className="card stat-card">
          <div className="card-header">
            <span className="card-title">Pending</span>
            <div className="card-icon" style={{ background: '#f97316' }}><Clock size={20} color="white" /></div>
          </div>
          <div className="stat-value" style={{ color: '#f97316' }}>{statusCounts.pending || 0}</div>
          <div className="stat-label">Awaiting Review</div>
        </div>

        <div className="card stat-card">
          <div className="card-header">
            <span className="card-title">Buses Flagged</span>
            <div className="card-icon primary"><Bus size={20} color="white" /></div>
          </div>
          <div className="stat-value">{busSummary.length}</div>
          <div className="stat-label">With Violations</div>
        </div>
      </div>

      {/* Violation Breakdown Chips */}
      {Object.keys(typeCounts).length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
          <div className="card-header"><span className="card-title">Violation Breakdown</span></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.5rem' }}>
            {Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} style={{
                padding: '6px 14px', borderRadius: 20,
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--gray-300)',
                border: '1px solid var(--glass-border)',
                fontSize: '0.8rem', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {violationIcon(type)}
                {type.replace(/_/g, ' ')}
                <span style={{ background: 'rgba(255,255,255,0.15)', padding: '1px 7px', borderRadius: 10, fontSize: '0.7rem' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bus Cards Grid */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Buses ({busSummary.length})</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
            Sorted by violation count · Red = most violations
          </span>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : busSummary.length === 0 ? (
          <div className="empty-state">
            <Shield size={48} style={{ opacity: 0.4 }} />
            <p>No violations recorded</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Violations from all devices (online & offline) will appear here</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1rem',
            marginTop: '1rem',
          }}>
            {busSummary.map((bus) => {
              const cardColor = getBusCardColor(bus.totalViolations, maxViolations);
              const topTypes = Object.entries(bus.byType || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);

              return (
                <div
                  key={bus.busNumber + bus.deviceKey}
                  onClick={() => navigate(`/violations/${encodeURIComponent(bus.deviceKey || bus.busNumber)}`)}
                  style={{
                    background: cardColor.bg,
                    border: `1px solid ${cardColor.border}`,
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                >
                  {/* Bus Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Bus size={20} color={cardColor.text} />
                      <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--gray-100)' }}>
                        {bus.busNumber || 'UNKNOWN'}
                      </span>
                    </div>
                    <ChevronRight size={18} color="var(--gray-500)" />
                  </div>

                  {/* Route */}
                  {bus.routeNumber && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={12} /> Route {bus.routeNumber}
                    </div>
                  )}

                  {/* Violation count — big number */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: cardColor.text }}>
                      {bus.totalViolations}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>violations</span>
                  </div>

                  {/* Today + Pending badges */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                    {bus.todayCount > 0 && (
                      <span style={{
                        padding: '2px 10px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 600,
                        color: '#f59e0b', background: 'rgba(245,158,11,0.15)',
                      }}>
                        {bus.todayCount} today
                      </span>
                    )}
                    {bus.pendingCount > 0 && (
                      <span style={{
                        padding: '2px 10px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 600,
                        color: '#f97316', background: 'rgba(249,115,22,0.12)',
                      }}>
                        {bus.pendingCount} pending
                      </span>
                    )}
                  </div>

                  {/* Top violation types */}
                  {topTypes.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {topTypes.map(([type, count]) => (
                        <span key={type} style={{
                          padding: '2px 8px', borderRadius: 8, fontSize: '0.68rem',
                          color: 'var(--gray-300)', background: 'rgba(255,255,255,0.06)',
                          display: 'flex', alignItems: 'center', gap: 3,
                        }}>
                          {violationIcon(type)} {type.replace(/_/g, ' ')} ({count})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Violations;
