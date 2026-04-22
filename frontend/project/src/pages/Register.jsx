import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "../components/UI";
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
const ROLE_ACCESS = {
  fisherman:   "Access: Fish Prediction + Species ID",
  scientist:   "Access: All 5 features",
  policymaker: "Access: Ecosystem Health + History",
  phd:         "Access: All 5 features + Research mode",
};

export default function Register() {
  const [form,    setForm]    = useState({ name:"", email:"", password:"", confirm:"", role:"fisherman" });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error("Passwords do not match."); return; }
    if (form.password.length < 6)       { toast.error("Password must be at least 6 characters."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { toast.error("Invalid email format."); return; }

    setLoading(true);
    try {
      const user = await register(form.name, form.email, form.password, form.role);
      toast.success("Account created! Welcome aboard!");
      navigate(ROLE_REDIRECT[user.role] || "/predict", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || "Registration failed. Try again.");
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
              <input type="email" value={form.email}
                onChange={e => update("email", e.target.value)}
                placeholder="ravi@cmlre.gov.in" required />
            </div>
          </div>

          <div className="auth-field">
            <label>Role</label>
            <select value={form.role} onChange={e => update("role", e.target.value)}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <span className="role-hint">{ROLE_ACCESS[form.role]}</span>
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

          <button type="submit" className="auth-btn" disabled={loading}
            style={{ opacity: loading ? 0.75 : 1 }}>
            {loading
              ? <span style={{ display:"flex", alignItems:"center",
                  gap:8, justifyContent:"center" }}>
                  <Spinner /> Creating account…
                </span>
              : "Create Account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}