import { NavLink } from "react-router-dom";
import { LayoutDashboard, Bus, Map, Settings, Activity } from "lucide-react";

function Sidebar() {
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
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <LayoutDashboard className="nav-item-icon" />
          Dashboard
        </NavLink>

        <NavLink
          to="/buses"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <Bus className="nav-item-icon" />
          Bus Fleet
        </NavLink>

        <NavLink
          to="/map"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <Map className="nav-item-icon" />
          Live Map
        </NavLink>
      </nav>

      <div
        style={{
          marginTop: "auto",
          paddingTop: "1rem",
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div className="nav-item" style={{ cursor: "default" }}>
          <Activity className="nav-item-icon" style={{ color: "#10b981" }} />
          <span style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
            System Online
          </span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
