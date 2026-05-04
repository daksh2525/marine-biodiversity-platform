import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import "../styles/Navbar.css";

const ROLE_BADGE = {
  fisherman:   { label: "Fisherman",   color: "#0284c7" },
  scientist:   { label: "Scientist",   color: "#16a34a" },
  policymaker: { label: "Policymaker", color: "#d97706" },
  phd:         { label: "PhD",         color: "#7c3aed" },
};

const NAV_ITEMS = {
  fisherman: [
    { to: "/predict", label: "Predict",   icon: "📊" },
    { to: "/species", label: "Species",   icon: "🐠" },
    { to: "/history", label: "History",   icon: "🕓" },
  ],
  scientist: [
    { to: "/predict",   label: "Predict",    icon: "📊" },
    { to: "/species",   label: "Species",    icon: "🐠" },
    { to: "/ecosystem", label: "Ecosystem",  icon: "🌊" },
    { to: "/otolith",   label: "Otolith",    icon: "🦴" },
    { to: "/edna",      label: "eDNA",       icon: "🧬" },
    { to: "/history",   label: "History",    icon: "🕓" },
  ],
  policymaker: [
    { to: "/ecosystem", label: "Ecosystem", icon: "🌊" },
    { to: "/history",   label: "History",   icon: "🕓" },
  ],
  phd: [
    { to: "/predict",   label: "Predict",   icon: "📊" },
    { to: "/species",   label: "Species",   icon: "🐠" },
    { to: "/ecosystem", label: "Ecosystem", icon: "🌊" },
    { to: "/otolith",   label: "Otolith",   icon: "🦴" },
    { to: "/edna",      label: "eDNA",      icon: "🧬" },
    { to: "/history",   label: "History",   icon: "🕓" },
  ],
};

export default function Navbar() {
  const { pathname }                 = useLocation();
  const { user, isLoggedIn, logout } = useAuth();
  const navigate                     = useNavigate();
  const [menuOpen, setMenuOpen]      = useState(false);

  const navItems = isLoggedIn ? (NAV_ITEMS[user?.role] || []) : [];
  const badge    = ROLE_BADGE[user?.role];

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    toast.success("Logged out successfully.");
    navigate("/login", { replace: true });
  };

  return (
    <>
      <nav className="navbar">

        {/* ── Brand ── */}
        <Link to="/" className="navbar-brand">
          <span className="logo">🐟</span>
          <div>
            <span className="brand-name">Marine Intelligence</span>
            <span className="brand-sub">CMLRE — Indian EEZ</span>
          </div>
        </Link>

        {/* ── Desktop nav links ── */}
        {isLoggedIn && (
          <div className="navbar-links">
            {navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={pathname === item.to ? "active" : ""}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        )}

        {/* ── Right ── */}
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

              {/* Desktop logout */}
              <button className="btn-logout" onClick={handleLogout}>
                Logout
              </button>

              {/* Hamburger */}
              <button
                className={`hamburger ${menuOpen ? "open" : ""}`}
                onClick={() => setMenuOpen(v => !v)}
                aria-label="Toggle menu"
              >
                <span /><span /><span />
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-login">Sign In</Link>
          )}
        </div>
      </nav>

      {/* ── Mobile menu ── */}
      {isLoggedIn && menuOpen && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: "fixed", inset: 0,
              top: "var(--nav-height)",
              background: "rgba(0,0,0,0.4)",
              zIndex: 98,
            }}
            onClick={() => setMenuOpen(false)}
          />

          <div className="mobile-menu">
            {/* User row */}
            <div className="mobile-user-row">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.1rem" }}>👤</span>
                <span className="user-name" style={{ display: "block" }}>
                  {user?.name}
                </span>
              </div>
              {badge && (
                <span className="role-badge" style={{ background: badge.color }}>
                  {badge.label}
                </span>
              )}
            </div>

            <div className="mobile-divider" />

            {/* Nav links */}
            {navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={pathname === item.to ? "active" : ""}
                onClick={() => setMenuOpen(false)}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}

            <div className="mobile-divider" />

            {/* Logout */}
            <button className="mobile-logout" onClick={handleLogout}>
              🚪 Logout
            </button>
          </div>
        </>
      )}
    </>
  );
}