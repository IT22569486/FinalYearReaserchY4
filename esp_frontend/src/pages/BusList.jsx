import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bus, 
  Search, 
  Filter,
  CloudRain,
  Sun,
  Users,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { useBuses } from '../hooks/useFleet';

function BusList() {
  const { buses, loading, refetch } = useBuses();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();

  // Filter buses based on search and status
  const filteredBuses = buses.filter(bus => {
    const matchesSearch = 
      bus.vehicle_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bus.route_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bus.location_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' || bus.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const onlineBuses = buses.filter(b => b.status === 'online').length;
  const offlineBuses = buses.filter(b => b.status === 'offline').length;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Bus Fleet</h1>
        <p className="page-subtitle">
          Manage and monitor all registered buses
        </p>
      </div>

      {/* Quick Stats */}
      <div className="stats-grid" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div className="card stat-card" style={{ padding: 'var(--spacing-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value" style={{ fontSize: '2rem' }}>{buses.length}</div>
              <div className="stat-label">Total Buses</div>
            </div>
            <Bus size={32} color="#3b82f6" />
          </div>
        </div>
        
        <div className="card stat-card" style={{ padding: 'var(--spacing-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value" style={{ fontSize: '2rem', color: '#10b981' }}>{onlineBuses}</div>
              <div className="stat-label">Online</div>
            </div>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }}></span>
            </div>
          </div>
        </div>
        
        <div className="card stat-card" style={{ padding: 'var(--spacing-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value" style={{ fontSize: '2rem', color: '#f43f5e' }}>{offlineBuses}</div>
              <div className="stat-label">Offline</div>
            </div>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(244, 63, 94, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f43f5e' }}></span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ 
            flex: 1, 
            minWidth: '250px',
            position: 'relative' 
          }}>
            <Search 
              size={18} 
              style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: '#6b7280'
              }} 
            />
            <input
              type="text"
              placeholder="Search by vehicle ID, route, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.5rem',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '0.5rem',
                color: '#f3f4f6',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => setStatusFilter('all')}
              className={`btn ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            >
              All
            </button>
            <button 
              onClick={() => setStatusFilter('online')}
              className={`btn ${statusFilter === 'online' ? 'btn-primary' : 'btn-secondary'}`}
              style={statusFilter === 'online' ? { background: 'var(--gradient-success)' } : {}}
            >
              Online
            </button>
            <button 
              onClick={() => setStatusFilter('offline')}
              className={`btn ${statusFilter === 'offline' ? 'btn-primary' : 'btn-secondary'}`}
              style={statusFilter === 'offline' ? { background: 'var(--gradient-danger)' } : {}}
            >
              Offline
            </button>
          </div>

          {/* Refresh Button */}
          <button onClick={refetch} className="btn btn-icon" title="Refresh">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Bus Table */}
      <div className="card">
        {loading ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : filteredBuses.length === 0 ? (
          <div className="empty-state">
            <Bus size={48} style={{ opacity: 0.5 }} />
            <p>No buses found</p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {buses.length === 0 
                ? 'ESP32 devices will appear here once connected'
                : 'Try adjusting your search or filters'}
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Vehicle ID</th>
                  <th>Route</th>
                  <th>Current Location</th>
                  <th>Direction</th>
                  <th>Safe Speed</th>
                  <th>Road</th>
                  <th>Passengers</th>
                  <th>Status</th>
                  <th>Last Update</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredBuses.map((bus) => (
                  <tr 
                    key={bus.vehicle_id}
                    onClick={() => navigate(`/buses/${bus.vehicle_id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Bus size={16} color="#3b82f6" />
                        {bus.vehicle_id}
                      </div>
                    </td>
                    <td>{bus.route_id}</td>
                    <td>{bus.location_name || 'Unknown'}</td>
                    <td style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                      {bus.direction?.replace(/_/g, ' → ') || '-'}
                    </td>
                    <td>
                      <div className="speed-display">
                        <span className="speed-value">{bus.safe_speed || 0}</span>
                        <span className="speed-unit">km/h</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${bus.road_condition?.toLowerCase() || 'dry'}`}>
                        {bus.road_condition === 'Wet' ? <CloudRain size={12} /> : <Sun size={12} />}
                        {bus.road_condition || 'Dry'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={14} color="#9ca3af" />
                        {bus.passenger_count || 0}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${bus.status}`}>
                        <span className="badge-dot"></span>
                        {bus.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                      {bus.last_update 
                        ? new Date(bus.last_update).toLocaleTimeString()
                        : '-'}
                    </td>
                    <td>
                      <ChevronRight size={18} color="#6b7280" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default BusList;
