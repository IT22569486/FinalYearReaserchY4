import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Bus,
  Map,
  Eye,
  AlertTriangle,
  LogOut,
  Settings,
  HelpCircle,
  FileText
} from 'lucide-react';

function Sidebar() {
  const { user, logout } = useAuth();
  const themeColor = '#ea580c';
  const themeLight = '#ffedd5';

  const navItemStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    color: isActive ? themeColor : '#6b7280',
    background: isActive ? themeLight : 'transparent',
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: isActive ? 600 : 500,
    marginBottom: '0.25rem',
    transition: 'all 0.2s',
  });

  return (
    <aside style={{
      width: '260px',
      minHeight: '100vh',
      background: '#ffffff',
      borderRight: '1px solid #f3f4f6',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 100,
      fontFamily: 'Plus Jakarta Sans, sans-serif'
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 80, height: 80, borderRadius: '8px' }}>
          <img src="/logo.png" alt="SafeTravo Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>SafeTravo</div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <NavLink to="/" end style={navItemStyle}>
          <LayoutDashboard size={18} />
          Dashboard
        </NavLink>
        <NavLink to="/buses" style={navItemStyle}>
          <Bus size={18} />
          Bus Fleet
        </NavLink>
        <NavLink to="/map" style={navItemStyle}>
          <Map size={18} />
          Live Map
        </NavLink>
        <NavLink to="/violations" style={navItemStyle}>
          <AlertTriangle size={18} />
          Violations
        </NavLink>
        <NavLink to="/driver-monitoring" style={navItemStyle}>
          <Eye size={18} />
          Driver Monitor
        </NavLink>

        {/* <div style={{ borderTop: '1px solid #f3f4f6', margin: '1.5rem 0', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <NavLink to="/reports" style={navItemStyle}>
            <FileText size={18} />
            Reports
          </NavLink>
          <NavLink to="/help" style={navItemStyle}>
            <HelpCircle size={18} />
            Help Center
          </NavLink>
          <NavLink to="/settings" style={navItemStyle}>
            <Settings size={18} />
            Settings
          </NavLink>
        </div> */}
      </nav>

     

      {/* Logout / User Account */}
      <div style={{ marginTop: 'auto' }}>
        <button
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            color: '#6b7280',
            background: 'none',
            border: 'none',
            width: '100%',
            textAlign: 'left',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
            borderRadius: '8px'
          }}
          onMouseOver={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fef2f2'; }}
          onMouseOut={(e) => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.background = 'transparent'; }}
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
