// ── Login.jsx ─────────────────────────────────────────────────────────────────
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/Auth.css";

const ROLE_REDIRECT = {
  fisherman:   "/predict",
  scientist:   "/predict",
  phd:         "/predict",
  policymaker: "/ecosystem",
};

export default function Login() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const user = await login(email, password);
      navigate(ROLE_REDIRECT[user.role] || "/predict", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">🐟</div>
        <h1>Marine Intelligence Platform</h1>
        <p className="auth-sub">CMLRE — Centre for Marine Living Resources & Ecology</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" required autoFocus />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required />
          </div>

          {error && <div className="auth-error">⚠️ {error}</div>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <><span className="auth-spinner-sm" /> Signing in…</> : "Sign In"}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
}

