import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bus, 
  CloudRain,
  Sun,
  Users,
  ChevronRight
} from 'lucide-react';
import { useBuses } from '../hooks/useFleet';

function BusList() {
  const { buses, loading } = useBuses();
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

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Bus Fleet</h1>
        <p className="page-subtitle">
          Manage and monitor all registered buses
        </p>
      </div>

      {/* Bus Table */}
      <div className="card">
        {loading ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : filteredBuses.length === 0 ? (
          <div className="empty-state">
            <Bus size={48} style={{ opacity: 0.5 }} />
            <p>No buses found</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--gray-400)' }}>
              {buses.length === 0 
                ? 'Devices will appear here once connected'
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
                        <Bus size={16} color="#db046c" />
                        {bus.vehicle_id}
                      </div>
                    </td>
                    <td>{bus.route_id}</td>
                    <td>{bus.location_name || 'Unknown'}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                      {bus.direction?.replace(/_/g, ' \u2192 ') || '-'}
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
                    <td style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
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
