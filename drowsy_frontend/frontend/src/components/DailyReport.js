import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const API_URL = 'http://localhost:5000/api';

const DailyReport = () => {
  const [report, setReport] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReport();
  }, [selectedDate]);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/report/daily?date=${selectedDate}`);
      setReport(response.data);
    } catch (error) {
      console.error('Error fetching report:', error);
      setError('Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];

  const getBehaviorChartData = () => {
    if (!report || !report.behavior_breakdown) return [];
    return Object.entries(report.behavior_breakdown).map(([key, value]) => ({
      name: key.replace('_', ' ').toUpperCase(),
      count: value
    }));
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
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
      {/* Date Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Daily Report</h2>
          </div>
          <div className="flex items-center space-x-4">
            <label className="text-sm font-semibold text-gray-700">Select Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-gray-700"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {report && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md p-6 text-white">
              <p className="text-blue-100 text-sm font-medium">Total Sessions</p>
              <p className="text-4xl font-bold mt-2">{report.total_sessions}</p>
              <p className="text-blue-100 text-xs mt-1">Driving sessions today</p>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-md p-6 text-white">
              <p className="text-red-100 text-sm font-medium">Total Alerts</p>
              <p className="text-4xl font-bold mt-2">{report.total_alerts}</p>
              <p className="text-red-100 text-xs mt-1">Behavior violations</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md p-6 text-white">
              <p className="text-green-100 text-sm font-medium">Behavior Types</p>
              <p className="text-4xl font-bold mt-2">{Object.keys(report.behavior_breakdown || {}).length}</p>
              <p className="text-green-100 text-xs mt-1">Different violations</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-md p-6 text-white">
              <p className="text-purple-100 text-sm font-medium">Report Date</p>
              <p className="text-2xl font-bold mt-2">{new Date(report.date).toLocaleDateString()}</p>
              <p className="text-purple-100 text-xs mt-1">Generated on {new Date(report.generated_at).toLocaleTimeString()}</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Behavior Distribution</h3>
              {getBehaviorChartData().length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getBehaviorChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-500 py-12">No data available</p>
              )}
            </div>

            {/* Pie Chart */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Behavior Breakdown</h3>
              {getBehaviorChartData().length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getBehaviorChartData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {getBehaviorChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-500 py-12">No data available</p>
              )}
            </div>
          </div>

          {/* Sessions Table */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Session Details</h3>
            {report.sessions && report.sessions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b-2 border-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Driver</th>
                      <th className="px-4 py-3 text-left font-semibold">Bus</th>
                      <th className="px-4 py-3 text-left font-semibold">Start Time</th>
                      <th className="px-4 py-3 text-left font-semibold">Duration</th>
                      <th className="px-4 py-3 text-left font-semibold">Total Alerts</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {report.sessions.map((session, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium">{session.driver_id || 'N/A'}</td>
                        <td className="px-4 py-3">{session.bus_number || 'N/A'}</td>
                        <td className="px-4 py-3">{new Date(session.start_time).toLocaleTimeString()}</td>
                        <td className="px-4 py-3">
                          {session.duration_seconds ? formatDuration(session.duration_seconds) : 'In Progress'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            session.total_alerts > 10 ? 'bg-red-100 text-red-800' :
                            session.total_alerts > 5 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {session.total_alerts}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {session.end_time ? (
                            <span className="text-gray-600">✓ Completed</span>
                          ) : (
                            <span className="text-blue-600 flex items-center">
                              <span className="w-2 h-2 bg-blue-600 rounded-full mr-2 animate-pulse"></span>
                              Active
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-12">No sessions found for this date</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DailyReport;
