import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Bus, 
  MapPin, 
  Gauge, 
  Users, 
  Thermometer,
  Droplets,
  CloudRain,
  Sun,
  Route,
  Clock,
  Navigation
} from 'lucide-react';
import { useBusDetails, useBusHistory } from '../hooks/useFleet';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

function BusDetail() {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const { bus, loading: busLoading } = useBusDetails(vehicleId);
  const { history, loading: historyLoading } = useBusHistory(vehicleId, 24);

  // Prepare chart data (reverse to show oldest first)
  const chartData = [...history].reverse().map((record, index) => ({
    time: new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    speed: record.safe_speed || 0,
    passengers: record.passenger_count || 0,
    temperature: record.temperature || 0
  }));

  if (busLoading) {
    return (
      <div className="fade-in">
        <div className="loading" style={{ height: '50vh' }}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (!bus) {
    return (
      <div className="fade-in">
        <div className="detail-header">
          <button className="back-button" onClick={() => navigate('/buses')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="page-title">Bus Not Found</h1>
            <p className="page-subtitle">The requested bus could not be found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="detail-header">
        <button className="back-button" onClick={() => navigate('/buses')}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 className="page-title">{bus.vehicle_id}</h1>
            <span className={`badge ${bus.status}`}>
              <span className="badge-dot"></span>
              {bus.status}
            </span>
          </div>
          <p className="page-subtitle">{bus.route_id}</p>
        </div>
      </div>

      {/* Main Info Cards */}
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="card-header">
            <span className="card-title">Safe Speed</span>
            <div className="card-icon primary">
              <Gauge size={20} color="white" />
            </div>
          </div>
          <div className="stat-value">
            {bus.safe_speed || 0}
            <span style={{ fontSize: '1rem', fontWeight: 400, color: '#9ca3af' }}> km/h</span>
          </div>
          <div className="stat-label">ML Predicted Speed</div>
        </div>

        <div className="card stat-card">
          <div className="card-header">
            <span className="card-title">Location</span>
            <div className="card-icon success">
              <MapPin size={20} color="white" />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '1.5rem' }}>
            {bus.location_name || 'Unknown'}
          </div>
          <div className="stat-label">{bus.direction?.replace(/_/g, ' → ')}</div>
        </div>

        <div className="card stat-card">
          <div className="card-header">
            <span className="card-title">Passengers</span>
            <div className="card-icon warning">
              <Users size={20} color="white" />
            </div>
          </div>
          <div className="stat-value">{bus.passenger_count || 0}</div>
          <div className="stat-label">{bus.passenger_load_kg || 0} kg total load</div>
        </div>

        <div className="card stat-card">
          <div className="card-header">
            <span className="card-title">Road Condition</span>
            <div className="card-icon primary">
              {bus.road_condition === 'Wet' ? <CloudRain size={20} color="white" /> : <Sun size={20} color="white" />}
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '1.5rem' }}>
            {bus.road_condition || 'Dry'}
          </div>
          <div className="stat-label">Current Condition</div>
        </div>
      </div>

      {/* Detailed Info */}
      <div className="grid-2" style={{ marginTop: 'var(--spacing-lg)' }}>
        {/* Bus Details Card */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Bus Details</span>
          </div>
          <div className="bus-info">
            <div className="info-item">
              <span className="info-label">Vehicle ID</span>
              <span className="info-value">{bus.vehicle_id}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Route</span>
              <span className="info-value">{bus.route_id}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Direction</span>
              <span className="info-value">{bus.direction?.replace(/_/g, ' → ') || '-'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">GPS Coordinates</span>
              <span className="info-value" style={{ fontSize: '0.875rem' }}>
                {bus.latitude?.toFixed(6)}, {bus.longitude?.toFixed(6)}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Temperature</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Thermometer size={16} color="#f59e0b" />
                <span className="info-value">{bus.temperature || 0}°C</span>
              </div>
            </div>
            <div className="info-item">
              <span className="info-label">Humidity</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Droplets size={16} color="#3b82f6" />
                <span className="info-value">{bus.humidity || 0}%</span>
              </div>
            </div>
            <div className="info-item">
              <span className="info-label">Last Update</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} color="#9ca3af" />
                <span className="info-value" style={{ fontSize: '0.875rem' }}>
                  {bus.last_update ? new Date(bus.last_update).toLocaleString() : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Speed History Chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Speed History (24h)</span>
          </div>
          <div className="chart-container">
            {historyLoading ? (
              <div className="loading"><div className="spinner"></div></div>
            ) : chartData.length === 0 ? (
              <div className="empty-state">
                <p>No history data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#1e293b', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="speed" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fill="url(#speedGradient)" 
                    name="Safe Speed (km/h)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Location History */}
      <div className="card" style={{ marginTop: 'var(--spacing-lg)' }}>
        <div className="card-header">
          <span className="card-title">Recent Location History</span>
        </div>
        {historyLoading ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : history.length === 0 ? (
          <div className="empty-state">
            <MapPin size={32} style={{ opacity: 0.5 }} />
            <p>No location history available</p>
          </div>
        ) : (
          <div className="timeline">
            {history.slice(0, 20).map((record, index) => (
              <div key={index} className="timeline-item slide-in" style={{ animationDelay: `${index * 50}ms` }}>
                <div className="timeline-time">
                  {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="timeline-content">
                  <div className="timeline-location">
                    <MapPin size={14} style={{ display: 'inline', marginRight: '0.5rem', color: '#3b82f6' }} />
                    {record.location_name || 'Unknown Location'}
                  </div>
                  <div className="timeline-details">
                    <span style={{ marginRight: '1rem' }}>
                      <Gauge size={12} style={{ marginRight: '0.25rem' }} />
                      {record.safe_speed} km/h
                    </span>
                    <span style={{ marginRight: '1rem' }}>
                      <Users size={12} style={{ marginRight: '0.25rem' }} />
                      {record.passenger_count} passengers
                    </span>
                    <span>
                      {record.road_condition === 'Wet' ? <CloudRain size={12} /> : <Sun size={12} />}
                      {' '}{record.road_condition}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default BusDetail;
