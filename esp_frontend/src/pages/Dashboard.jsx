import { 
  Bus, 
  Activity, 
  Gauge, 
  Users, 
  CloudRain,
  Sun,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { useFleetOverview, useBuses, useStatistics } from '../hooks/useFleet';
import { 
  AreaChart, 
  Area, 
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

function Dashboard() {
  const { data: overview, loading: overviewLoading } = useFleetOverview();
  const { buses, loading: busesLoading } = useBuses();
  const { stats, loading: statsLoading } = useStatistics();

  const onlineBuses = buses.filter(b => b.status === 'online');
  const offlineBuses = buses.filter(b => b.status === 'offline');

  const COLORS = ['#10b981', '#f43f5e', '#3b82f6', '#f59e0b', '#8b5cf6'];

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Fleet Dashboard</h1>
        <p className="page-subtitle">
          Real-time monitoring of your bus fleet • Last updated: {new Date().toLocaleTimeString()}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="card-header">
            <span className="card-title">Total Buses</span>
            <div className="card-icon primary">
              <Bus size={20} color="white" />
            </div>
          </div>
          <div className="stat-value">
            {overviewLoading ? '...' : overview?.total_buses || 0}
          </div>
          <div className="stat-label">Registered Vehicles</div>
        </div>

        <div className="card stat-card">
          <div className="card-header">
            <span className="card-title">Online Buses</span>
            <div className="card-icon success">
              <Activity size={20} color="white" />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#10b981' }}>
            {overviewLoading ? '...' : overview?.online_buses || 0}
          </div>
          <div className="stat-label">Currently Active</div>
          <div className="stat-change positive">
            <TrendingUp size={14} />
            {overview?.total_buses > 0 
              ? Math.round((overview?.online_buses / overview?.total_buses) * 100) 
              : 0}% online
          </div>
        </div>

        <div className="card stat-card">
          <div className="card-header">
            <span className="card-title">Avg Safe Speed</span>
            <div className="card-icon primary">
              <Gauge size={20} color="white" />
            </div>
          </div>
          <div className="stat-value">
            {overviewLoading ? '...' : overview?.average_speed || 0}
            <span style={{ fontSize: '1rem', fontWeight: 400, color: '#9ca3af' }}> km/h</span>
          </div>
          <div className="stat-label">Fleet Average</div>
        </div>

        <div className="card stat-card">
          <div className="card-header">
            <span className="card-title">Total Passengers</span>
            <div className="card-icon warning">
              <Users size={20} color="white" />
            </div>
          </div>
          <div className="stat-value">
            {overviewLoading ? '...' : overview?.total_passengers || 0}
          </div>
          <div className="stat-label">Currently Onboard</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid-2" style={{ marginBottom: 'var(--spacing-xl)' }}>
        {/* Speed Distribution */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Speed Distribution</span>
          </div>
          <div className="chart-container">
            {statsLoading ? (
              <div className="loading"><div className="spinner"></div></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.speed_distribution || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="range" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#1e293b', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Road Conditions */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Road Conditions</span>
          </div>
          <div className="chart-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {overviewLoading ? (
              <div className="loading"><div className="spinner"></div></div>
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
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: '#9ca3af' }}
                  >
                    <Cell fill="#3b82f6" />
                    <Cell fill="#60a5fa" />
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      background: '#1e293b', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sun size={18} color="#3b82f6" />
              <span style={{ color: '#9ca3af' }}>Dry: {overview?.road_conditions?.dry || 0}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CloudRain size={18} color="#60a5fa" />
              <span style={{ color: '#9ca3af' }}>Wet: {overview?.road_conditions?.wet || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Active Buses</span>
          <a href="/buses" className="btn btn-secondary" style={{ fontSize: '0.875rem' }}>
            View All
          </a>
        </div>
        
        {busesLoading ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : buses.length === 0 ? (
          <div className="empty-state">
            <Bus size={48} style={{ opacity: 0.5 }} />
            <p>No buses registered yet</p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              ESP32 devices will appear here once connected
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Vehicle ID</th>
                  <th>Route</th>
                  <th>Location</th>
                  <th>Safe Speed</th>
                  <th>Road Condition</th>
                  <th>Passengers</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {buses.slice(0, 5).map((bus) => (
                  <tr key={bus.vehicle_id}>
                    <td style={{ fontWeight: 600 }}>{bus.vehicle_id}</td>
                    <td>{bus.route_id}</td>
                    <td>{bus.location_name || 'Unknown'}</td>
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

export default Dashboard;
