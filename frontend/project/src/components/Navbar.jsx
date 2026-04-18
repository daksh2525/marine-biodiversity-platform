
// ── src/components/Navbar.jsx ─────────────────────────────────────────────────
import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const { pathname } = useLocation();
  const active = (path) => pathname === path ? "active" : "";

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="logo">🐟</span>
        <span>Marine Intelligence Platform</span>
        <span className="subtitle">CMLRE — Indian EEZ</span>
      </div>
      <div className="navbar-links">
        <Link className={active("/")}          to="/">Predict</Link>
        <Link className={active("/species")}   to="/species">🐠 Species ID</Link>
        <Link className={active("/ecosystem")} to="/ecosystem">🌊 Ecosystem</Link>
        <Link className={active("/history")}   to="/history">History</Link>
      </div>
    </nav>
  );
}