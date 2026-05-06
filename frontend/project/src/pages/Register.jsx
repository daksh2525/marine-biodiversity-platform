import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "../components/UI";

const ROLES = [
  { value: "fisherman",   label: "🎣 Fisherman",               color: "#0284c7", bg: "rgba(2,132,199,0.1)" },
  { value: "scientist",   label: "🔬 Marine Scientist",         color: "#16a34a", bg: "rgba(22,163,74,0.1)" },
  { value: "policymaker", label: "📋 Policymaker",              color: "#d97706", bg: "rgba(217,119,6,0.1)" },
  { value: "phd",         label: "🎓 PhD Student / Researcher", color: "#7c3aed", bg: "rgba(124,58,237,0.1)" },
];
const ROLE_REDIRECT = {
  fisherman: "/predict", scientist: "/predict",
  phd: "/predict",       policymaker: "/ecosystem",
};
const ROLE_ACCESS = {
  fisherman:   { text: "Fish Prediction + Species ID",           icon: "🐟" },
  scientist:   { text: "All 5 features unlocked",                icon: "🌊" },
  policymaker: { text: "Ecosystem Health + History",             icon: "📊" },
  phd:         { text: "All 5 features + Research mode",         icon: "🧬" },
};

export default function Register() {
  const [form,     setForm]     = useState({ name:"", email:"", password:"", confirm:"", role:"fisherman" });
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const selectedRole = ROLES.find(r => r.value === form.role);
  const passMatch = form.confirm && form.password === form.confirm;
  const passMismatch = form.confirm && form.password !== form.confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm)              { toast.error("Passwords do not match."); return; }
    if (form.password.length < 6)                   { toast.error("Password must be at least 6 characters."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { toast.error("Invalid email format."); return; }
    setLoading(true);
    try {
      const user = await register(form.name, form.email, form.password, form.role);
      toast.success("Account created! Welcome aboard!");
      navigate(ROLE_REDIRECT[user.role] || "/predict", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || "Registration failed. Try again.");
    } finally { setLoading(false); }
  };

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(24px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes float {
          0%,100% { transform:translateY(0); }
          50%      { transform:translateY(-7px); }
        }
        @keyframes spin { to { transform:rotate(360deg); } }

        .reg-card { animation: fadeUp .5s cubic-bezier(.4,0,.2,1) both; }
        .reg-logo { animation: float 4s ease-in-out infinite; }

        .reg-input {
          width:100%; background:rgba(255,255,255,0.04);
          border:1.5px solid rgba(255,255,255,0.09); border-radius:12px;
          padding:.72rem 1rem; color:#e8f4f8; font-size:.875rem;
          font-family:inherit; outline:none; box-sizing:border-box;
          transition:border-color .2s, background .2s, box-shadow .2s;
        }
        .reg-input::placeholder { color:#2a4a62; }
        .reg-input:focus {
          border-color:rgba(6,182,212,.6);
          background:rgba(6,182,212,.05);
          box-shadow:0 0 0 4px rgba(6,182,212,.12);
        }
        .reg-input:hover:not(:focus) { border-color:rgba(255,255,255,.14); }
        .reg-input.error { border-color:rgba(239,68,68,.5); box-shadow:0 0 0 3px rgba(239,68,68,.1); }
        .reg-input.success { border-color:rgba(34,197,94,.45); box-shadow:0 0 0 3px rgba(34,197,94,.08); }

        .reg-select {
          width:100%; background:rgba(255,255,255,0.04);
          border:1.5px solid rgba(255,255,255,0.09); border-radius:12px;
          padding:.72rem 2.4rem .72rem 1rem; color:#e8f4f8;
          font-size:.875rem; font-family:inherit; outline:none;
          appearance:none; cursor:pointer; box-sizing:border-box;
          transition:border-color .2s, background .2s, box-shadow .2s;
        }
        .reg-select:focus {
          border-color:rgba(6,182,212,.6);
          background:rgba(6,182,212,.05);
          box-shadow:0 0 0 4px rgba(6,182,212,.12);
        }
        .reg-select option { background:#0d1f35; color:#e8f4f8; }

        .reg-label {
          display:block; font-size:.68rem; font-weight:700;
          letter-spacing:.09em; text-transform:uppercase;
          color:#4a6a82; margin-bottom:.4rem;
        }

        .reg-btn {
          width:100%; border:none; border-radius:12px; color:#050e1d;
          font-size:.9rem; font-weight:700; padding:.875rem; cursor:pointer;
          letter-spacing:.03em;
          background:linear-gradient(135deg,#06b6d4 0%,#0891b2 100%);
          box-shadow:0 4px 20px rgba(6,182,212,.35);
          transition:transform .15s, box-shadow .15s;
          display:flex; align-items:center; justify-content:center; gap:.5rem;
        }
        .reg-btn:hover:not(:disabled) {
          transform:translateY(-2px);
          box-shadow:0 8px 28px rgba(6,182,212,.5);
          background:linear-gradient(135deg,#22d3ee 0%,#06b6d4 100%);
        }
        .reg-btn:active:not(:disabled) { transform:translateY(0); }
        .reg-btn:disabled { opacity:.65; cursor:not-allowed; }

        .eye-btn {
          position:absolute; right:.85rem; top:50%; transform:translateY(-50%);
          background:none; border:none; color:#2a4a62; cursor:pointer;
          padding:0; display:flex; transition:color .15s;
        }
        .eye-btn:hover { color:#06b6d4; }

        @media (max-width:640px) {
          .reg-row { grid-template-columns:1fr !important; }
        }
      `}</style>

      <div style={{ minHeight:"100vh", background:"#050e1d", display:"flex",
        alignItems:"center", justifyContent:"center", padding:"1.5rem 1rem",
        position:"relative", overflow:"hidden",
        fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>

        {/* Ambient glows */}
        <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:"-20%", left:"-10%", width:"55vw", height:"55vw",
            borderRadius:"50%", background:"radial-gradient(circle,rgba(6,182,212,.07) 0%,transparent 70%)" }} />
          <div style={{ position:"absolute", bottom:"-15%", right:"-5%", width:"45vw", height:"45vw",
            borderRadius:"50%", background:"radial-gradient(circle,rgba(124,58,237,.05) 0%,transparent 70%)" }} />
          <div style={{ position:"absolute", inset:0, opacity:.2,
            backgroundImage:"radial-gradient(rgba(6,182,212,.18) 1px,transparent 1px)",
            backgroundSize:"32px 32px" }} />
        </div>

        {/* Card */}
        <div className="reg-card" style={{ width:"100%", maxWidth:560, position:"relative", zIndex:1,
          background:"rgba(13,31,53,0.82)", border:"1px solid rgba(255,255,255,0.08)",
          borderRadius:"24px", padding:"2.25rem 2.25rem",
          backdropFilter:"blur(20px)",
          boxShadow:"0 24px 80px rgba(0,0,0,.5), 0 0 0 1px rgba(6,182,212,.05) inset" }}>

          {/* Logo */}
          <div style={{ textAlign:"center", marginBottom:"1.5rem" }}>
            <div className="reg-logo" style={{ display:"inline-flex", alignItems:"center",
              justifyContent:"center", width:58, height:58, borderRadius:"16px",
              background:"linear-gradient(135deg,rgba(6,182,212,.18),rgba(6,182,212,.06))",
              border:"1px solid rgba(6,182,212,.22)", fontSize:"1.8rem", marginBottom:".85rem",
              boxShadow:"0 8px 28px rgba(6,182,212,.15)" }}>🐟</div>
            <h1 style={{ fontSize:"1.2rem", fontWeight:700, color:"#e8f4f8",
              letterSpacing:"-0.02em", marginBottom:".3rem" }}>Create Account</h1>
            <p style={{ fontSize:".7rem", color:"#4a6a82", letterSpacing:".04em" }}>
              Marine Intelligence Platform — CMLRE
            </p>
          </div>

          {/* Divider */}
          <div style={{ display:"flex", alignItems:"center", gap:".75rem", marginBottom:"1.4rem" }}>
            <div style={{ flex:1, height:1, background:"rgba(255,255,255,.06)" }} />
            <span style={{ fontSize:".58rem", fontWeight:700, letterSpacing:".14em",
              textTransform:"uppercase", color:"#2a4a62", whiteSpace:"nowrap" }}>
              Fill in your details
            </span>
            <div style={{ flex:1, height:1, background:"rgba(255,255,255,.06)" }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:".9rem" }}>

            {/* Name + Email row */}
            <div className="reg-row" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".75rem" }}>
              {/* Name */}
              <div>
                <label className="reg-label">Full Name</label>
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", left:".85rem", top:"50%",
                    transform:"translateY(-50%)", color:"#2a4a62", pointerEvents:"none" }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                  <input value={form.name} onChange={e => update("name", e.target.value)}
                    placeholder="Dr. Ravi Kumar" required autoFocus
                    className="reg-input" style={{ paddingLeft:"2.4rem" }} />
                </div>
              </div>
              {/* Email */}
              <div>
                <label className="reg-label">Email</label>
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", left:".85rem", top:"50%",
                    transform:"translateY(-50%)", color:"#2a4a62", pointerEvents:"none" }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <input type="email" value={form.email} onChange={e => update("email", e.target.value)}
                    placeholder="ravi@cmlre.gov.in" required
                    className="reg-input" style={{ paddingLeft:"2.4rem" }} />
                </div>
              </div>
            </div>

            {/* Role selector */}
            <div>
              <label className="reg-label">Role</label>
              <div style={{ position:"relative" }}>
                <select value={form.role} onChange={e => update("role", e.target.value)}
                  className="reg-select">
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <span style={{ position:"absolute", right:".85rem", top:"50%",
                  transform:"translateY(-50%)", pointerEvents:"none", color:"#06b6d4" }}>
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </div>
              {/* Role access hint */}
              {selectedRole && (
                <div style={{ marginTop:".5rem", display:"flex", alignItems:"center", gap:".5rem",
                  background: selectedRole.bg, border:`1px solid ${selectedRole.color}30`,
                  borderRadius:"9px", padding:".45rem .75rem" }}>
                  <span style={{ fontSize:".85rem" }}>{ROLE_ACCESS[form.role].icon}</span>
                  <span style={{ fontSize:".68rem", color: selectedRole.color, fontWeight:600 }}>
                    Access: {ROLE_ACCESS[form.role].text}
                  </span>
                </div>
              )}
            </div>

            {/* Password + Confirm row */}
            <div className="reg-row" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".75rem" }}>
              {/* Password */}
              <div>
                <label className="reg-label">Password</label>
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", left:".85rem", top:"50%",
                    transform:"translateY(-50%)", color:"#2a4a62", pointerEvents:"none" }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input type={showPass ? "text" : "password"} value={form.password}
                    onChange={e => update("password", e.target.value)}
                    placeholder="Min 6 chars" required
                    className="reg-input" style={{ paddingLeft:"2.4rem", paddingRight:"2.6rem" }} />
                  <button type="button" className="eye-btn" onClick={() => setShowPass(v => !v)}
                    style={{ color: showPass ? "#06b6d4" : "#2a4a62" }}>
                    {showPass
                      ? <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      : <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    }
                  </button>
                </div>
              </div>
              {/* Confirm */}
              <div>
                <label className="reg-label">Confirm Password</label>
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", left:".85rem", top:"50%",
                    transform:"translateY(-50%)", color:"#2a4a62", pointerEvents:"none" }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </span>
                  <input type={showConf ? "text" : "password"} value={form.confirm}
                    onChange={e => update("confirm", e.target.value)}
                    placeholder="Repeat password" required
                    className={`reg-input ${passMismatch ? "error" : passMatch ? "success" : ""}`}
                    style={{ paddingLeft:"2.4rem", paddingRight:"2.6rem" }} />
                  <button type="button" className="eye-btn" onClick={() => setShowConf(v => !v)}
                    style={{ color: showConf ? "#06b6d4" : "#2a4a62" }}>
                    {showConf
                      ? <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      : <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    }
                  </button>
                </div>
                {passMismatch && (
                  <p style={{ fontSize:".62rem", color:"#f87171", marginTop:".3rem" }}>
                    ⚠️ Passwords don't match
                  </p>
                )}
                {passMatch && (
                  <p style={{ fontSize:".62rem", color:"#4ade80", marginTop:".3rem" }}>
                    ✓ Passwords match
                  </p>
                )}
              </div>
            </div>

            {/* Submit */}
            <button type="submit" className="reg-btn" disabled={loading}
              style={{ marginTop:".2rem", opacity: loading ? .72 : 1 }}>
              {loading ? (
                <>
                  <span style={{ width:15, height:15, border:"2px solid rgba(5,14,29,.25)",
                    borderTopColor:"#050e1d", borderRadius:"50%",
                    animation:"spin .7s linear infinite", flexShrink:0 }} />
                  Creating account…
                </>
              ) : (
                <>
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Create Account
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p style={{ textAlign:"center", marginTop:"1.2rem",
            fontSize:".78rem", color:"#4a6a82" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color:"#06b6d4", fontWeight:600, textDecoration:"none",
              transition:"color .15s" }}
              onMouseEnter={e => e.target.style.color="#22d3ee"}
              onMouseLeave={e => e.target.style.color="#06b6d4"}>
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}