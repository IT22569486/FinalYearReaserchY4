import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const Drivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driverStats, setDriverStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const formatTime = (timestamp) => {
    // Handle MongoDB $date format
    let dateValue = timestamp;
    if (typeof timestamp === 'object' && timestamp.$date) {
      dateValue = timestamp.$date;
    }
    
    // Parse the date
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    // Get the raw UTC time components (what's stored in DB)
    const hours24 = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const seconds = date.getUTCSeconds();
    const day = date.getUTCDate();
    const month = date.getUTCMonth() + 1;
    const year = date.getUTCFullYear();
    
    // Convert to 12-hour format
    const isPM = hours24 >= 12;
    const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
    
    // Format
    const dateStr = `${month}/${day}/${year}`;
    const timeStr = `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
    
    return `${dateStr}, ${timeStr} IST`;
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const response = await axios.get(`${API_URL}/drivers`);
      setDrivers(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      setLoading(false);
    }
  };

  const fetchDriverStats = async (driverId) => {
    try {
      const response = await axios.get(`${API_URL}/driver/${driverId}/stats`);
      setDriverStats(response.data);
      setSelectedDriver(driverId);
    } catch (error) {
      console.error('Error fetching driver stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-gray-200">
          <div className="p-2 bg-blue-100 rounded-lg">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Registered Drivers</h2>
        </div>

        {drivers.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">No drivers registered yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drivers.map((driver) => (
              <div
                key={driver.driver_id}
                className="border-2 border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer bg-gradient-to-br from-white to-gray-50"
                onClick={() => fetchDriverStats(driver.driver_id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{driver.driver_name}</h3>
                    <p className="text-sm text-gray-600 font-mono">ID: {driver.driver_id}</p>
                    <p className="text-sm text-gray-600 mt-1">License: {driver.license_number}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-200">
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Sessions</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{driver.total_sessions || 0}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                    <p className="text-xs text-red-700 font-semibold uppercase tracking-wide">Violations</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">{driver.total_violations || 0}</p>
                  </div>
                </div>

                <button className="mt-4 w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold shadow-sm hover:shadow-md">
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Driver Statistics Modal/Panel */}
      {driverStats && selectedDriver && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                Driver Statistics: {driverStats.driver_info?.driver_name}
              </h3>
            </div>
            <button
              onClick={() => {
                setSelectedDriver(null);
                setDriverStats(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕ Close
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
              <p className="text-blue-100 text-sm">Total Sessions</p>
              <p className="text-3xl font-bold">{driverStats.driver_info?.total_sessions || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-4 text-white">
              <p className="text-red-100 text-sm">Total Violations</p>
              <p className="text-3xl font-bold">{driverStats.driver_info?.total_violations || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
              <p className="text-green-100 text-sm">Avg per Session</p>
              <p className="text-3xl font-bold">
                {driverStats.driver_info?.total_sessions > 0
                  ? (driverStats.driver_info.total_violations / driverStats.driver_info.total_sessions).toFixed(1)
                  : 0}
              </p>
            </div>
          </div>

          {/* Violation Breakdown */}
          {driverStats.violation_breakdown && Object.keys(driverStats.violation_breakdown).length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-bold text-gray-800 mb-3">Violation Breakdown</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(driverStats.violation_breakdown).map(([type, count]) => (
                  <div key={type} className="border rounded-lg p-3 bg-gray-50">
                    <p className="text-sm text-gray-600 capitalize">{type.replace('_', ' ')}</p>
                    <p className="text-2xl font-bold text-gray-800">{count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Violations */}
          <div>
            <h4 className="text-lg font-bold text-gray-800 mb-3">Recent Violations</h4>
            {driverStats.recent_violations && driverStats.recent_violations.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {driverStats.recent_violations.map((violation, index) => (
                  <div key={index} className="border rounded-lg p-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800 capitalize">
                        {violation.behavior_type?.replace('_', ' ') || 'Unknown'}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        violation.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        violation.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {violation.severity}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {violation.timestamp ? formatTime(violation.timestamp) : 'N/A'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-6">No recent violations</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Drivers;
