import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Bus, 
  Map, 
  Eye,
  AlertTriangle,
  LogOut,
  Shield,
  User
} from 'lucide-react';

function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Bus size={24} color="white" />
        </div>
        <div>
          <div className="sidebar-logo-text">SmartBus</div>
          <div className="sidebar-logo-subtitle">Fleet Manager</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink 
          to="/" 
          end
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard className="nav-item-icon" />
          Dashboard
        </NavLink>

        <NavLink 
          to="/buses" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Bus className="nav-item-icon" />
          Bus Fleet
        </NavLink>

        <NavLink 
          to="/map" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Map className="nav-item-icon" />
          Live Map
        </NavLink>

        <NavLink 
          to="/violations" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <AlertTriangle className="nav-item-icon" />
          Violations
        </NavLink>

        <NavLink 
          to="/driver-monitoring" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Eye className="nav-item-icon" />
          Driver Monitor
        </NavLink>
      </nav>

      {/* User Profile Section */}
      <div className="sidebar-user">
        <div className="sidebar-user-info">
          <div className="sidebar-user-avatar">
            <User size={18} />
          </div>
          <div className="sidebar-user-details">
            <span className="sidebar-user-name">{user?.name || 'Admin'}</span>
            <span className="sidebar-user-role">
              <Shield size={10} />
              {user?.role || 'admin'}
            </span>
          </div>
        </div>
        <button className="sidebar-logout-btn" onClick={logout} title="Logout">
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
