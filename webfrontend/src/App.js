import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BusList from './pages/BusList';
import BusDetail from './pages/BusDetail';
import MapView from './pages/MapView';
import DriverMonitoring from './pages/DriverMonitoring';
import Violations from './pages/Violations';
import ViolationBusDetail from './pages/ViolationBusDetail';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading" style={{ height: '100vh' }}><div className="spinner"></div></div>;
  return user ? children : <Navigate to="/login" replace />;
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading" style={{ height: '100vh' }}><div className="spinner"></div></div>;
  }

  // Not logged in — show login page
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/buses" element={<PrivateRoute><BusList /></PrivateRoute>} />
          <Route path="/buses/:vehicleId" element={<PrivateRoute><BusDetail /></PrivateRoute>} />
          <Route path="/map" element={<PrivateRoute><MapView /></PrivateRoute>} />
          <Route path="/violations" element={<PrivateRoute><Violations /></PrivateRoute>} />
          <Route path="/violations/:deviceKey" element={<PrivateRoute><ViolationBusDetail /></PrivateRoute>} />
          <Route path="/driver-monitoring" element={<PrivateRoute><DriverMonitoring /></PrivateRoute>} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
