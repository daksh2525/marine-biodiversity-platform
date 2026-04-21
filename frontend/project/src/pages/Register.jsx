
// ── Register.jsx ──────────────────────────────────────────────────────────────
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/Auth.css";

const ROLES = [
  { value: "fisherman",   label: "🎣 Fisherman" },
  { value: "scientist",   label: "🔬 Marine Scientist" },
  { value: "policymaker", label: "📋 Policymaker" },
  { value: "phd",         label: "🎓 PhD Student / Researcher" },
];

const ROLE_REDIRECT = {
  fisherman: "/predict", scientist: "/predict",
  phd: "/predict",       policymaker: "/ecosystem",
};

export function Register() {
  const [form,    setForm]    = useState({ name:"", email:"", password:"", confirm:"", role:"fisherman" });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm)
      return setError("Passwords do not match");
    if (form.password.length < 6)
      return setError("Password must be at least 6 characters");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return setError("Invalid email format");

    setLoading(true);
    try {
      const user = await register(form.name, form.email, form.password, form.role);
      navigate(ROLE_REDIRECT[user.role] || "/predict", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <div className="auth-logo">🐟</div>
        <h1>Create Account</h1>
        <p className="auth-sub">Marine Intelligence Platform — CMLRE</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-row">
            <div className="auth-field">
              <label>Full Name</label>
              <input value={form.name} onChange={e => update("name", e.target.value)}
                placeholder="Dr. Ravi Kumar" required autoFocus />
            </div>
            <div className="auth-field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={e => update("email", e.target.value)}
                placeholder="ravi@cmlre.gov.in" required />
            </div>
          </div>

          <div className="auth-field">
            <label>Role</label>
            <select value={form.role} onChange={e => update("role", e.target.value)}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <span className="role-hint">
              {form.role === "fisherman"   && "Access: Fish Prediction + Species ID"}
              {form.role === "scientist"   && "Access: All 5 features"}
              {form.role === "policymaker" && "Access: Ecosystem Health + History"}
              {form.role === "phd"         && "Access: All 5 features + Research mode"}
            </span>
          </div>

          <div className="auth-row">
            <div className="auth-field">
              <label>Password</label>
              <input type="password" value={form.password}
                onChange={e => update("password", e.target.value)}
                placeholder="Min 6 characters" required />
            </div>
            <div className="auth-field">
              <label>Confirm Password</label>
              <input type="password" value={form.confirm}
                onChange={e => update("confirm", e.target.value)}
                placeholder="Repeat password" required />
            </div>
          </div>

          {error && <div className="auth-error">⚠️ {error}</div>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <><span className="auth-spinner-sm" /> Creating account…</> : "Create Account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;