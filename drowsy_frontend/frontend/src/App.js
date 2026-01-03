import React, { useState } from 'react';
import LiveMonitor from './components/LiveMonitor';
import DailyReport from './components/DailyReport';
import Statistics from './components/Statistics';
import Drivers from './components/Drivers';
import Buses from './components/Buses';

function App() {
  const [activeTab, setActiveTab] = useState('live');

  const tabs = [
    { id: 'live', name: 'Live Monitor' },
    { id: 'report', name: 'Daily Report' },
    { id: 'stats', name: 'Statistics' },
    { id: 'drivers', name: 'Drivers' },
    { id: 'buses', name: 'Buses' },
  ];

  const getTabIcon = (tabId) => {
    const icons = {
      live: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      report: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      stats: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      drivers: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      buses: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
    };
    return icons[tabId];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 text-white shadow-xl border-b border-slate-700">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-600 p-3 rounded-lg shadow-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Driver Monitoring System</h1>
                <p className="text-slate-300 text-sm font-medium">Real-time Behavior Tracking & Analytics Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-slate-700/50 backdrop-blur-sm px-5 py-2.5 rounded-lg border border-slate-600">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">System Status</p>
                <p className="text-sm font-semibold flex items-center mt-1">
                  <span className="w-2.5 h-2.5 bg-green-500 rounded-full mr-2 animate-pulse shadow-lg shadow-green-500/50"></span>
                  <span className="text-green-400">Online</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-6">
          <nav className="flex space-x-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-5 py-3.5 font-semibold text-sm transition-all duration-200 border-b-3 relative ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                }`}
              >
                {getTabIcon(tab.id)}
                <span>{tab.name}</span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t"></div>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="fade-in">
          {activeTab === 'live' && <LiveMonitor />}
          {activeTab === 'report' && <DailyReport />}
          {activeTab === 'stats' && <Statistics />}
          {activeTab === 'drivers' && <Drivers />}
          {activeTab === 'buses' && <Buses />}
        </div>
      </main>

     
    </div>
  );
}

export default App;
