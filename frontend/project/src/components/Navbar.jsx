import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const { pathname } = useLocation();
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="logo">🐟</span>
        <span>Fish Abundance Predictor</span>
        <span className="subtitle">CMLRE — Indian EEZ</span>
      </div>
      <div className="navbar-links">
        <Link className={pathname === "/"        ? "active" : ""} to="/">Predict</Link>
        <Link className={pathname === "/history" ? "active" : ""} to="/history">History</Link>
      </div>
    </nav>
  );
}