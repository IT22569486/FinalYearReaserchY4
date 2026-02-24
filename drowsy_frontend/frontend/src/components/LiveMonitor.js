import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const LiveMonitor = () => {
  const [behaviors, setBehaviors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLive = async () => {
      try {
        const response = await axios.get(`${API_URL}/behaviors/live?seconds=30`);
        setBehaviors(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching live data:', error);
        setError('Failed to fetch live data');
        setLoading(false);
      }
    };

    // Fetch immediately
    fetchLive();

    // Poll every 2 seconds
    const interval = setInterval(fetchLive, 2000);

    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'bg-red-50 border-red-400 text-red-900',
      warning: 'bg-amber-50 border-amber-400 text-amber-900',
      notice: 'bg-blue-50 border-blue-400 text-blue-900',
      normal: 'bg-green-50 border-green-400 text-green-900'
    };
    return colors[severity] || 'bg-gray-50 border-gray-400 text-gray-900';
  };

  const getBehaviorIcon = (behaviorType) => {
    const iconClass = "w-10 h-10";
    const icons = {
      phone_use: (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      sleep: (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ),
      drowsy: (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      yawning: (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      head_turned: (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
        </svg>
      ),
      hands_off: (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
        </svg>
      )
    };
    return icons[behaviorType] || (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
  };

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
    
    // Convert to 12-hour format
    const isPM = hours24 >= 12;
    const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
    
    // Format
    const timeStr = `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
    
    return `${timeStr} IST`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-16 h-16 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-3 text-red-700 bg-red-100 border border-red-400 rounded-lg">
        <p className="font-bold">Error</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="p-6 transition-shadow bg-white border border-gray-200 shadow-sm rounded-xl hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold tracking-wide text-gray-600 uppercase">Total Alerts</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{behaviors.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
          </div>
        </div>

        <div className="p-6 transition-shadow bg-white border border-gray-200 shadow-sm rounded-xl hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold tracking-wide text-gray-600 uppercase">Critical</p>
              <p className="mt-2 text-3xl font-bold text-red-600">
                {behaviors.filter(b => b.severity === 'critical').length}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="p-6 transition-shadow bg-white border border-gray-200 shadow-sm rounded-xl hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold tracking-wide text-gray-600 uppercase">Warnings</p>
              <p className="mt-2 text-3xl font-bold text-amber-600">
                {behaviors.filter(b => b.severity === 'warning').length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-amber-100">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="p-6 transition-shadow bg-white border border-gray-200 shadow-sm rounded-xl hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold tracking-wide text-gray-600 uppercase">Last 30s</p>
              <p className="flex items-center mt-2 text-3xl font-bold text-blue-600">
                <span className="w-3 h-3 mr-2 bg-blue-600 rounded-full animate-pulse"></span> Live
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Live Alerts */}
      <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
        <div className="flex items-center pb-4 mb-6 space-x-3 border-b border-gray-200">
          <div className="p-2 bg-blue-100 rounded-lg">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Live Behavior Alerts</h2>
        </div>

        {behaviors.length === 0 ? (
          <div className="py-16 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-4 bg-green-100 rounded-full">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xl font-semibold text-gray-700">No Recent Alerts</p>
            <p className="mt-2 text-sm text-gray-500">All systems operating normally</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {behaviors.map((behavior, index) => (
              <div
                key={index}
                className={`border-l-4 rounded-xl p-5 transition-all duration-200 hover:shadow-md ${getSeverityColor(behavior.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start flex-1 space-x-4">
                    <div className="mt-1">{getBehaviorIcon(behavior.behavior_type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold tracking-wide uppercase">
                          {behavior.behavior_type.replace('_', ' ')}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          behavior.severity === 'critical' ? 'bg-red-600 text-white' :
                          behavior.severity === 'warning' ? 'bg-amber-600 text-white' :
                          'bg-blue-600 text-white'
                        }`}>
                          {behavior.severity}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3 text-sm md:grid-cols-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="font-semibold text-gray-700">{behavior.driver_id || 'N/A'}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                          <span className="font-semibold text-gray-700">{behavior.bus_number || 'N/A'}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-semibold text-gray-700">{formatTime(behavior.timestamp)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          <span className="font-mono text-xs text-gray-600">{typeof behavior.session_id === 'object' ? behavior.session_id.$oid?.substring(0, 8) : behavior.session_id?.substring(0, 8)}...</span>
                        </div>
                      </div>

                      {behavior.metrics && (
                        <div className="p-3 mt-2 border border-gray-200 rounded-lg bg-white/70 backdrop-blur">
                          <p className="mb-2 text-xs font-bold tracking-wide text-gray-700 uppercase">Metrics</p>
                          <div className="grid grid-cols-3 gap-3 text-xs">
                            {behavior.metrics.ear !== undefined && (
                              <div className="flex flex-col">
                                <span className="font-semibold text-gray-600">EAR</span>
                                <span className="font-mono text-gray-900">{behavior.metrics.ear?.toFixed(3)}</span>
                              </div>
                            )}
                            {behavior.metrics.mar !== undefined && (
                              <div className="flex flex-col">
                                <span className="font-semibold text-gray-600">MAR</span>
                                <span className="font-mono text-gray-900">{behavior.metrics.mar?.toFixed(3)}</span>
                              </div>
                            )}
                            {behavior.metrics.yaw !== undefined && (
                              <div className="flex flex-col">
                                <span className="font-semibold text-gray-600">Yaw</span>
                                <span className="font-mono text-gray-900">{behavior.metrics.yaw?.toFixed(1)}°</span>
                              </div>
                            )}
                            {behavior.metrics.num_hands !== undefined && (
                              <div className="flex flex-col">
                                <span className="font-semibold text-gray-600">Hands</span>
                                <span className="font-mono text-gray-900">{behavior.metrics.num_hands}</span>
                              </div>
                            )}
                            {behavior.metrics.phone_detected !== undefined && (
                              <div className="flex flex-col">
                                <span className="font-semibold text-gray-600">Phone</span>
                                <span className={`font-semibold ${behavior.metrics.phone_detected ? 'text-red-600' : 'text-green-600'}`}>
                                  {behavior.metrics.phone_detected ? 'Detected' : 'None'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveMonitor;
