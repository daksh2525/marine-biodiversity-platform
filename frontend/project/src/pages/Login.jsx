import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "../components/UI";
import "../styles/Auth.css";

const ROLE_REDIRECT = {
  fisherman: "/predict", scientist: "/predict",
  phd: "/predict",       policymaker: "/ecosystem",
};

export default function Login() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name.split(" ")[0]}!`);
      navigate(ROLE_REDIRECT[user.role] || "/predict", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || "Invalid email or password.");
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
            <input type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" required autoFocus />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}
            style={{ opacity: loading ? 0.75 : 1 }}>
            {loading
              ? <span style={{ display:"flex", alignItems:"center",
                  gap:8, justifyContent:"center" }}>
                  <Spinner /> Signing in…
                </span>
              : "Sign In"}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
}