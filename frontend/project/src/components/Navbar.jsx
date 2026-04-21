
// ── src/components/Navbar.jsx — complete updated version ──────────────────────
import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const { pathname } = useLocation();
  const a = (p) => pathname === p ? "active" : "";
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="logo">🐟</span>
        <span>Marine Intelligence Platform</span>
        <span className="subtitle">CMLRE — Indian EEZ</span>
      </div>
      <div className="navbar-links">
        <Link className={a("/")}          to="/">📊 Predict</Link>
        <Link className={a("/species")}   to="/species">🐠 Species ID</Link>
        <Link className={a("/ecosystem")} to="/ecosystem">🌊 Ecosystem</Link>
        <Link className={a("/otolith")}   to="/otolith">🦴 Otolith</Link>
        <Link className={a("/edna")}      to="/edna">🧬 eDNA</Link>
        <Link className={a("/history")}   to="/history">🕓 History</Link>
      </div>
    </nav>
  );
}