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
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import api from '../services/api';
import socketService from '../services/socket';

const SEVERITY_CONFIG = {
  HIGH: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'High' },
  MEDIUM: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Medium' },
  LOW: { color: '#db046c', bg: 'rgba(219,4,108,0.12)', label: 'Low' },
  CRITICAL: { color: '#dc2626', bg: 'rgba(220,38,38,0.12)', label: 'Critical' },
  critical: { color: '#dc2626', bg: 'rgba(220,38,38,0.12)', label: 'Critical' },
  danger: { color: '#f97316', bg: 'rgba(249,115,22,0.12)', label: 'Danger' },
  warning: { color: '#eab308', bg: 'rgba(234,179,8,0.12)', label: 'Warning' },
  info: { color: '#db046c', bg: 'rgba(219,4,108,0.12)', label: 'Info' },
};

const ITEMS_PER_PAGE = 10;

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

function ViolationBusDetail() {
  const { deviceKey } = useParams();
  const navigate = useNavigate();
  const [violations, setViolations] = useState([]);
  const [totalViolations, setTotalViolations] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [showFilter, setShowFilter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const [violRes, devRes] = await Promise.all([
        api.get(`/api/violations/device/${encodeURIComponent(deviceKey)}`, {
          params: { limit: ITEMS_PER_PAGE, page }
        }),
        api.get(`/api/devices/${encodeURIComponent(deviceKey)}`).catch(() => ({ data: null })),
      ]);
      const data = violRes.data || {};
      setViolations(Array.isArray(data.violations) ? data.violations : []);
      setTotalViolations(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setCurrentPage(data.page || 1);
      setDevice(devRes.data || null);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [deviceKey]);

  useEffect(() => {
    fetchData(1);

    const socket = socketService.connect();
    const onNew = (data) => {
      const v = data.violation || data;
      if (v.deviceKey === deviceKey) {
        // Refresh current page to show updated data
        fetchData(currentPage);
      }
    };
    socket.on('newViolation', onNew);

    return () => { socket.off('newViolation', onNew); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, deviceKey]);

  // Derived data
  const busNumber = device?.busNumber || violations[0]?.busNumber || deviceKey;
  const routeNumber = device?.routeNumber || violations[0]?.routeNumber || '';

  // Count by type (from current page — just for quick filter chips display)
  const typeCounts = {};
  violations.forEach(v => { if (v.type) typeCounts[v.type] = (typeCounts[v.type] || 0) + 1; });
  const types = Object.keys(typeCounts);

  // Client-side type filter on current page
  const filtered = typeFilter === 'all' ? violations : violations.filter(v => v.type === typeFilter);

  // Page change handler (fetches from backend)
  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchData(page);
  };

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
                Device: {deviceKey} · {totalViolations} violations
              </p>
            </div>
          </div>
          <button onClick={() => fetchData(currentPage)} className="btn btn-secondary" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: 'var(--spacing-lg)' }}>
        <div className="card-header" style={{ marginBottom: '1rem' }}>
          <span className="card-title">Violation Summary</span>
        </div>
        <div style={{ textAlign: 'center', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.1)' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444' }}>{totalViolations}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Total Violations</div>
        </div>
        {/* Type breakdown (from current page) */}
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

      {/* Violation Log Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            {typeFilter !== 'all' ? `${typeFilter.replace(/_/g, ' ')} Violations` : 'Violation Log'} ({typeFilter !== 'all' ? filtered.length : totalViolations})
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
                        background: t === typeFilter ? 'rgba(219,4,108,0.1)' : 'transparent',
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
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Severity</th>
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
                        <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--gray-400)' }}>
                          {v.description || v.details?.description || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button className="pagination-btn" disabled={currentPage <= 1} onClick={() => handlePageChange(currentPage - 1)}>
                  <ChevronLeft size={16} />
                </button>
                {renderPageNumbers(currentPage, totalPages, handlePageChange)}
                <button className="pagination-btn" disabled={currentPage >= totalPages} onClick={() => handlePageChange(currentPage + 1)}>
                  <ChevronRight size={16} />
                </button>
                <span className="pagination-info">
                  Page {currentPage} of {totalPages} ({totalViolations} total)
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ViolationBusDetail;
