import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/Navbar.css";

const ROLE_BADGE = {
  fisherman:   { label: "Fisherman",   color: "#1e90ff" },
  scientist:   { label: "Scientist",   color: "#2e7d32" },
  policymaker: { label: "Policymaker", color: "#f57f17" },
  phd:         { label: "PhD",         color: "#9c27b0" },
};

// Role-based nav items
const NAV_ITEMS = {
  fisherman:   [
    { to: "/predict", label: "📊 Predict" },
    { to: "/species", label: "🐠 Species" },
    { to: "/history", label: "🕓 History" },
  ],
  scientist:   [
    { to: "/predict",   label: "📊 Predict" },
    { to: "/species",   label: "🐠 Species" },
    { to: "/ecosystem", label: "🌊 Ecosystem" },
    { to: "/otolith",   label: "🦴 Otolith" },
    { to: "/edna",      label: "🧬 eDNA" },
    { to: "/history",   label: "🕓 History" },
  ],
  policymaker: [
    { to: "/ecosystem", label: "🌊 Ecosystem" },
    { to: "/history",   label: "🕓 History" },
  ],
  phd: [
    { to: "/predict",   label: "📊 Predict" },
    { to: "/species",   label: "🐠 Species" },
    { to: "/ecosystem", label: "🌊 Ecosystem" },
    { to: "/otolith",   label: "🦴 Otolith" },
    { to: "/edna",      label: "🧬 eDNA" },
    { to: "/history",   label: "🕓 History" },
  ],
};

export default function Navbar() {
  const { pathname }          = useLocation();
  const { user, isLoggedIn, logout } = useAuth();
  const navigate              = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = isLoggedIn ? (NAV_ITEMS[user?.role] || []) : [];
  const badge    = ROLE_BADGE[user?.role];

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate("/login", { replace: true });
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="logo">🐟</span>
        <div>
          <span className="brand-name">Marine Intelligence</span>
          <span className="brand-sub">CMLRE — Indian EEZ</span>
        </div>
      </div>

      {/* Desktop nav */}
      {isLoggedIn && (
        <div className="navbar-links">
          {navItems.map(item => (
            <Link key={item.to}
              className={pathname === item.to ? "active" : ""}
              to={item.to}>
              {item.label}
            </Link>
          ))}
        </div>
      )}

      {/* Right side */}
      <div className="navbar-right">
        {isLoggedIn ? (
          <>
            <div className="user-info">
              <span className="user-name">{user?.name?.split(" ")[0]}</span>
              {badge && (
                <span className="role-badge" style={{ background: badge.color }}>
                  {badge.label}
                </span>
              )}
            </div>
            <button className="btn-logout" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <Link to="/login" className="btn-login">Sign In</Link>
        )}

        {/* Hamburger */}
        {isLoggedIn && (
          <button className={`hamburger ${menuOpen ? "open" : ""}`}
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu">
            <span /><span /><span />
          </button>
        )}
      </div>

      {/* Mobile menu */}
      {isLoggedIn && menuOpen && (
        <div className="mobile-menu">
          {navItems.map(item => (
            <Link key={item.to} to={item.to}
              className={pathname === item.to ? "active" : ""}
              onClick={() => setMenuOpen(false)}>
              {item.label}
            </Link>
          ))}
          <button className="btn-logout mobile-logout" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      )}
    </nav>
  );
}