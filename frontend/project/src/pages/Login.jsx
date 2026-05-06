import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "../components/UI";

const ROLE_REDIRECT = {
  fisherman: "/predict", scientist: "/predict",
  phd: "/predict",       policymaker: "/ecosystem",
};

export default function Login() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);
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
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(6,182,212,0.4); }
          70%  { transform: scale(1);    box-shadow: 0 0 0 14px rgba(6,182,212,0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(6,182,212,0); }
        }
        @keyframes shimmer {
          from { background-position: -200% center; }
          to   { background-position:  200% center; }
        }
        .login-card   { animation: fadeUp .55s cubic-bezier(.4,0,.2,1) both; }
        .login-logo   { animation: float 4s ease-in-out infinite; }

        .login-input {
          width: 100%; background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.09);
          border-radius: 12px; padding: 0.78rem 1rem;
          color: #e8f4f8; font-size: 0.875rem; font-family: inherit;
          outline: none; transition: border-color .2s, background .2s, box-shadow .2s;
          box-sizing: border-box;
        }
        .login-input::placeholder { color: #2a4a62; }
        .login-input:focus {
          border-color: rgba(6,182,212,0.6);
          background: rgba(6,182,212,0.05);
          box-shadow: 0 0 0 4px rgba(6,182,212,0.12);
        }
        .login-input:hover:not(:focus) { border-color: rgba(255,255,255,0.14); }

        .login-btn {
          width: 100%; border: none; border-radius: 12px;
          color: #050e1d; font-size: 0.9rem; font-weight: 700;
          padding: 0.875rem; cursor: pointer; letter-spacing: 0.03em;
          background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
          box-shadow: 0 4px 20px rgba(6,182,212,0.35);
          transition: transform .15s, box-shadow .15s, opacity .15s;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
        }
        .login-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(6,182,212,0.5);
          background: linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%);
        }
        .login-btn:active:not(:disabled) { transform: translateY(0); }
        .login-btn:disabled { opacity: 0.65; cursor: not-allowed; }

        .login-divider-line {
          flex: 1; height: 1px; background: rgba(255,255,255,0.06);
        }

        /* Role pill hover */
        .role-pill {
          display: inline-flex; align-items: center; gap: 0.3rem;
          padding: 0.2rem 0.6rem; border-radius: 999px;
          font-size: 0.62rem; font-weight: 600; letter-spacing: 0.06em;
          border: 1px solid; transition: transform .15s;
          cursor: default;
        }
        .role-pill:hover { transform: scale(1.06); }
      `}</style>

      <div style={{
        minHeight: "100vh", background: "#050e1d",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem", position: "relative", overflow: "hidden",
        fontFamily: "'DM Sans','Segoe UI',sans-serif",
      }}>

        {/* ── Ambient background glows ── */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "-20%", left: "-10%",
            width: "55vw", height: "55vw", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 70%)" }} />
          <div style={{ position: "absolute", bottom: "-15%", right: "-5%",
            width: "45vw", height: "45vw", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(34,197,94,0.05) 0%, transparent 70%)" }} />
          {/* Grid dots */}
          <div style={{ position: "absolute", inset: 0, opacity: 0.25,
            backgroundImage: "radial-gradient(rgba(6,182,212,0.18) 1px, transparent 1px)",
            backgroundSize: "32px 32px" }} />
        </div>

        {/* ── Card ── */}
        <div className="login-card" style={{
          width: "100%", maxWidth: 420, position: "relative", zIndex: 1,
          background: "rgba(13,31,53,0.8)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "24px", padding: "2.5rem 2.25rem",
          backdropFilter: "blur(20px)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(6,182,212,0.06) inset",
        }}>

          {/* ── Logo ── */}
          <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
            <div className="login-logo" style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 64, height: 64, borderRadius: "18px",
              background: "linear-gradient(135deg, rgba(6,182,212,0.18), rgba(6,182,212,0.06))",
              border: "1px solid rgba(6,182,212,0.22)",
              fontSize: "2rem", marginBottom: "1rem",
              boxShadow: "0 8px 32px rgba(6,182,212,0.15)",
              animation: "float 4s ease-in-out infinite",
            }}>🐟</div>

            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#e8f4f8",
              letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: "0.35rem" }}>
              Marine Intelligence
            </h1>
            <p style={{ fontSize: "0.72rem", color: "#4a6a82", letterSpacing: "0.04em",
              lineHeight: 1.5 }}>
              CMLRE — Centre for Marine Living Resources & Ecology
            </p>
          </div>

          {/* ── Section label ── */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <div className="login-divider-line" />
            <span style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.14em",
              textTransform: "uppercase", color: "#2a4a62", whiteSpace: "nowrap" }}>
              Sign in to your account
            </span>
            <div className="login-divider-line" />
          </div>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* Email */}
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600,
                letterSpacing: "0.08em", textTransform: "uppercase",
                color: "#4a6a82", marginBottom: "0.45rem" }}>Email</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "0.85rem", top: "50%",
                  transform: "translateY(-50%)", color: "#2a4a62", pointerEvents: "none" }}>
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" required autoFocus
                  className="login-input" style={{ paddingLeft: "2.5rem" }} />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600,
                letterSpacing: "0.08em", textTransform: "uppercase",
                color: "#4a6a82", marginBottom: "0.45rem" }}>Password</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "0.85rem", top: "50%",
                  transform: "translateY(-50%)", color: "#2a4a62", pointerEvents: "none" }}>
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input type={showPass ? "text" : "password"} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className="login-input" style={{ paddingLeft: "2.5rem", paddingRight: "2.75rem" }} />
                {/* Show/hide toggle */}
                <button type="button" onClick={() => setShowPass(v => !v)}
                  style={{ position: "absolute", right: "0.85rem", top: "50%",
                    transform: "translateY(-50%)", background: "none", border: "none",
                    color: showPass ? "#06b6d4" : "#2a4a62", cursor: "pointer",
                    padding: 0, transition: "color .15s", display: "flex" }}>
                  {showPass ? (
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" className="login-btn" disabled={loading}
              style={{ marginTop: "0.25rem", opacity: loading ? 0.72 : 1 }}>
              {loading ? (
                <>
                  <span style={{ width: 16, height: 16, border: "2px solid rgba(5,14,29,0.25)",
                    borderTopColor: "#050e1d", borderRadius: "50%",
                    animation: "spin .7s linear infinite", flexShrink: 0 }} />
                  Signing in…
                </>
              ) : (
                <>
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* ── Role badges ── */}
          <div style={{ marginTop: "1.5rem", paddingTop: "1.25rem",
            borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "#2a4a62", textAlign: "center", marginBottom: "0.65rem" }}>
              Platform Roles
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", justifyContent: "center" }}>
              {[
                { label: "Fisherman",   color: "#0284c7", bg: "rgba(2,132,199,0.1)",   icon: "🎣" },
                { label: "Scientist",   color: "#16a34a", bg: "rgba(22,163,74,0.1)",   icon: "🔬" },
                { label: "PhD",         color: "#7c3aed", bg: "rgba(124,58,237,0.1)", icon: "🎓" },
                { label: "Policymaker", color: "#d97706", bg: "rgba(217,119,6,0.1)",  icon: "📋" },
              ].map(r => (
                <span key={r.label} className="role-pill"
                  style={{ color: r.color, background: r.bg, borderColor: `${r.color}40` }}>
                  {r.icon} {r.label}
                </span>
              ))}
            </div>
          </div>

          {/* ── Footer link ── */}
          <p style={{ textAlign: "center", marginTop: "1.25rem",
            fontSize: "0.78rem", color: "#4a6a82" }}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "#06b6d4", fontWeight: 600,
              textDecoration: "none", transition: "color .15s" }}
              onMouseEnter={e => e.target.style.color = "#22d3ee"}
              onMouseLeave={e => e.target.style.color = "#06b6d4"}>
              Register here →
            </Link>
          </p>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </>
  );
}