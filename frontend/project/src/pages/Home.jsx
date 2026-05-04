import { useState, useEffect, useRef } from "react";
import {
  MapContainer, TileLayer, CircleMarker, Popup, useMap,
} from "react-leaflet";
import toast from "react-hot-toast";
import { TempAbundanceChart, MonthlyDistributionChart } from "../components/Charts";
import { predictFish, getHistory } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { TooltipIcon, SkeletonCard, EmptyState, AnimatedNumber, abundanceBorder } from "../components/UI";
import INDIAN_OCEAN_ZONES, { ZONE_HEALTH_COLOR } from "../data/oceanZones";
import "leaflet/dist/leaflet.css";

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, zoom, { animate: true, duration: 1.5 }); }, [center, zoom]);
  return null;
}

const PARAM_TOOLTIPS = {
  temperature: "Temperature of ocean surface water in Celsius",
  salinity:    "Amount of dissolved salts in seawater (PSU)",
  oxygen:      "Oxygen dissolved in water (mg/L). Fish need > 5 mg/L",
  chlorophyll: "Phytoplankton measure — more = more fish food (mg/m³)",
  month:       "Current month affects fish migration patterns",
  depth:       "Water depth in meters where fish are found",
};

const PARAMS = [
  { key: "temperature", label: "Sea Surface Temp", unit: "°C",    min: 0, max: 40,   step: 0.1,  default: 27,  icon: "🌡️" },
  { key: "salinity",    label: "Salinity",          unit: "PSU",   min: 0, max: 45,   step: 0.1,  default: 33,  icon: "🧂" },
  { key: "oxygen",      label: "Dissolved Oxygen",  unit: "mg/L",  min: 0, max: 15,   step: 0.1,  default: 6,   icon: "💧" },
  { key: "chlorophyll", label: "Chlorophyll-a",     unit: "mg/m³", min: 0, max: 20,   step: 0.01, default: 1.5, icon: "🌿" },
  { key: "month",       label: "Month",             unit: "",      min: 1, max: 12,   step: 1,    default: 6,   icon: "📅" },
  { key: "depth",       label: "Depth",             unit: "m",     min: 1, max: 1000, step: 1,    default: 100, icon: "⚓" },
];

const MONTH_NAMES = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const CAT_COLOR  = { High: "#22c55e", Medium: "#f59e0b", Low: "#ef4444" };
const CAT_BG     = { High: "rgba(34,197,94,0.08)",  Medium: "rgba(245,158,11,0.08)",  Low: "rgba(239,68,68,0.08)" };
const CAT_BORDER = { High: "rgba(34,197,94,0.25)",  Medium: "rgba(245,158,11,0.25)",  Low: "rgba(239,68,68,0.25)" };
const CAT_DOT    = { High: "#22c55e", Medium: "#f59e0b", Low: "#ef4444" };

/* ── SliderRow ── */
function SliderRow({ p, value, onChange }) {
  const pct = ((value - p.min) / (p.max - p.min)) * 100;
  return (
    <div style={{ marginBottom: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", minWidth: 0 }}>
          <span style={{ fontSize: "0.85rem", flexShrink: 0 }}>{p.icon}</span>
          <span style={{ fontSize: "0.75rem", color: "#8fb4cc", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.label}</span>
          <TooltipIcon text={PARAM_TOOLTIPS[p.key]} />
        </div>
        <span style={{ fontFamily: "monospace", fontSize: "0.7rem", fontWeight: 600, color: "#06b6d4",
          background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)",
          padding: "0.12rem 0.45rem", borderRadius: "6px", flexShrink: 0, marginLeft: "0.5rem" }}>
          {p.key === "month" ? MONTH_NAMES[value] : value}{p.unit}
        </span>
      </div>
      <input type="range" min={p.min} max={p.max} step={p.step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-predict-slider"
        style={{ width: "100%", height: "4px", borderRadius: "4px", appearance: "none",
          outline: "none", cursor: "pointer",
          background: `linear-gradient(to right, #06b6d4 ${pct}%, #1a3347 ${pct}%)` }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.2rem" }}>
        <span style={{ fontSize: "0.58rem", color: "#2a4a62" }}>{p.min}</span>
        <span style={{ fontSize: "0.58rem", color: "#2a4a62" }}>{p.max}</span>
      </div>
    </div>
  );
}

/* ── ResultCard ── */
function ResultCard({ result, compact = false }) {
  if (!result) return null;
  const c = result.category;
  return (
    <div style={{ background: CAT_BG[c], border: `1px solid ${CAT_BORDER[c]}`,
      borderRadius: "14px", overflow: "hidden", marginTop: compact ? 0 : "0.5rem" }}>
      <div style={{ padding: "0.55rem 1rem", borderBottom: `1px solid ${CAT_BORDER[c]}`,
        display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.14em",
          textTransform: "uppercase", color: "#4a6a82" }}>Result</span>
        <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "0.18rem 0.6rem",
          borderRadius: "999px", background: CAT_BG[c], border: `1px solid ${CAT_BORDER[c]}`,
          color: CAT_COLOR[c] }}>{c} Abundance</span>
      </div>
      <div style={{ padding: "0.75rem 1rem" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem", marginBottom: "0.65rem" }}>
          <span style={{ fontSize: compact ? "1.7rem" : "2rem", fontWeight: 800, color: "#e8f4f8",
            fontFamily: "monospace", letterSpacing: "-0.02em" }}>
            <AnimatedNumber value={result.fish_abundance_kg_km2} decimals={2} />
          </span>
          <span style={{ fontSize: "0.7rem", color: "#4a6a82" }}>kg / km²</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.35rem" }}>
          {[["RF", result.rf_prediction], ["XGB", result.xgb_prediction], ["Ensemble", result.fish_abundance_kg_km2]].map(([label, val]) => (
            <div key={label} style={{ background: "rgba(0,0,0,0.2)", borderRadius: "8px",
              padding: "0.4rem 0.35rem", textAlign: "center" }}>
              <p style={{ fontSize: "0.52rem", color: "#4a6a82", textTransform: "uppercase",
                letterSpacing: "0.08em", marginBottom: "0.2rem" }}>{label}</p>
              <p style={{ fontFamily: "monospace", fontSize: "0.68rem", fontWeight: 600, color: "#8fb4cc" }}>{val}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── FishermanView ── */
function FishermanView({ selectedZone, onZoneSelect, result, loading, error }) {
  const zone = selectedZone ? INDIAN_OCEAN_ZONES[selectedZone] : null;
  const c = result?.category;
  return (
    <div style={{ minHeight: "100vh", background: "#050e1d", display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ width: "100%", maxWidth: "360px" }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <span style={{ display: "inline-block", fontSize: "0.62rem", letterSpacing: "0.2em",
            textTransform: "uppercase", color: "rgba(6,182,212,0.6)", background: "rgba(6,182,212,0.06)",
            border: "1px solid rgba(6,182,212,0.12)", borderRadius: "999px",
            padding: "0.28rem 0.85rem", marginBottom: "0.65rem" }}>Fishing Assistant</span>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#e8f4f8", letterSpacing: "-0.02em" }}>
            Select Your Zone
          </h1>
        </div>
        <div style={{ background: "#0d1f35", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "18px", padding: "1.25rem", marginBottom: "0.75rem" }}>
          <p style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.14em",
            textTransform: "uppercase", color: "#4a6a82", marginBottom: "0.6rem" }}>Indian Ocean Zones</p>
          <div style={{ position: "relative" }}>
            <select style={{ width: "100%", background: "rgba(0,0,0,0.3)",
              border: "1.5px solid rgba(6,182,212,0.28)", borderRadius: "12px",
              padding: "0.68rem 2rem 0.68rem 0.9rem", color: "#e8f4f8",
              fontSize: "0.85rem", appearance: "none", cursor: "pointer", outline: "none" }}
              value={selectedZone} onChange={(e) => onZoneSelect(e.target.value)}>
              <option value="">Choose a fishing zone…</option>
              {Object.keys(INDIAN_OCEAN_ZONES).map((k) => (<option key={k} value={k}>{k}</option>))}
            </select>
            <svg style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)",
              width: 14, height: 14, color: "#06b6d4", pointerEvents: "none" }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          {zone && <p style={{ fontSize: "0.72rem", color: "#4a6a82", marginTop: "0.6rem",
            lineHeight: 1.5, borderLeft: "2px solid rgba(6,182,212,0.2)", paddingLeft: "0.5rem" }}>
            📍 {zone.description}</p>}
        </div>
        {loading && (
          <div style={{ background: "#0d1f35", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "18px", padding: "2.5rem 1rem", textAlign: "center" }}>
            <div style={{ width: 32, height: 32, border: "2px solid rgba(6,182,212,0.15)",
              borderTopColor: "#06b6d4", borderRadius: "50%", animation: "spin .75s linear infinite",
              margin: "0 auto 0.75rem" }} />
            <p style={{ fontSize: "0.82rem", color: "#4a6a82" }}>Analysing zone…</p>
          </div>
        )}
        {result && !loading && (
          <div style={{ background: "#0d1f35", border: `1px solid ${CAT_BORDER[c]}`,
            borderRadius: "18px", padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.14em",
                textTransform: "uppercase", color: "#4a6a82" }}>Prediction</span>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "0.2rem 0.6rem",
                borderRadius: "999px", background: CAT_BG[c], border: `1px solid ${CAT_BORDER[c]}`,
                color: CAT_COLOR[c] }}>{c}</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem", marginBottom: "0.85rem" }}>
              <span style={{ fontSize: "2.2rem", fontWeight: 800, color: "#e8f4f8",
                fontFamily: "monospace", letterSpacing: "-0.03em" }}>
                <AnimatedNumber value={result.fish_abundance_kg_km2} decimals={2} />
              </span>
              <span style={{ fontSize: "0.8rem", color: "#4a6a82" }}>kg/km²</span>
            </div>
            <div style={{ background: CAT_BG[c], border: `1px solid ${CAT_BORDER[c]}`,
              borderRadius: "10px", padding: "0.75rem", fontSize: "0.82rem",
              color: CAT_COLOR[c], lineHeight: 1.5 }}>
              {c === "High"   && "✅ Good — go 15–20 km offshore"}
              {c === "Medium" && "⚠️ Moderate — check weather first"}
              {c === "Low"    && "❌ Poor — try another zone"}
            </div>
          </div>
        )}
        {error && (
          <div style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.22)",
            borderRadius: "14px", padding: "0.85rem", fontSize: "0.8rem", color: "#fca5a5", marginTop: "0.75rem" }}>
            ⚠️ {error}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────── Main ── */
export default function Home() {
  const { user } = useAuth();
  const isFisherman = user?.role === "fisherman";

  const [values,      setValues]      = useState(Object.fromEntries(PARAMS.map((p) => [p.key, p.default])));
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [history,     setHistory]     = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [mapCenter,   setMapCenter]   = useState([10, 76]);
  const [mapZoom,     setMapZoom]     = useState(5);
  const [inputLatLng, setInputLatLng] = useState(null);
  const [selZone,     setSelZone]     = useState("");
  const [zoneLoaded,  setZoneLoaded]  = useState(false);
  const [zoneMarker,  setZoneMarker]  = useState(null);
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const resultRef = useRef();

  useEffect(() => {
    setHistLoading(true);
    getHistory().then(setHistory).catch(() => {}).finally(() => setHistLoading(false));
  }, [result]);

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  const handleZoneSelect = async (zoneName) => {
    setSelZone(zoneName); setZoneLoaded(false); setResult(null); setError("");
    if (!zoneName || !INDIAN_OCEAN_ZONES[zoneName]) return;
    const z = INDIAN_OCEAN_ZONES[zoneName];
    setValues((v) => ({ ...v, temperature: z.temp, salinity: z.salinity,
      oxygen: z.oxygen, chlorophyll: z.chlorophyll, depth: z.depth }));
    setMapCenter([z.lat, z.lng]); setMapZoom(z.zoom);
    setZoneMarker({ lat: z.lat, lng: z.lng, name: zoneName, desc: z.description, health: z.healthLevel });
    setZoneLoaded(true);
    toast.success(`${zoneName} loaded!`);
    if (isFisherman)
      await runPredict({ temperature: z.temp, salinity: z.salinity, oxygen: z.oxygen,
        chlorophyll: z.chlorophyll, month: values.month, depth: z.depth }, z.lat, z.lng);
  };

  const runPredict = async (params, lat, lng) => {
    setLoading(true); setError("");
    try {
      const useLat = lat ?? 10 + (Math.random() - 0.5) * 14;
      const useLng = lng ?? 76 + (Math.random() - 0.5) * 20;
      const res = await predictFish({ ...params, latitude: useLat, longitude: useLng });
      setResult(res); setInputLatLng([useLat, useLng]);
      toast.success("Prediction complete!"); setDrawerOpen(false);
    } catch (e) {
      const msg = e.response?.data?.error || "Prediction failed. Try again.";
      setError(msg); toast.error(msg);
    } finally { setLoading(false); }
  };

  if (isFisherman)
    return <FishermanView selectedZone={selZone} onZoneSelect={handleZoneSelect}
      result={result} loading={loading} error={error} />;

  return (
    <>
      <style>{`
        .h-predict-slider::-webkit-slider-thumb {
          -webkit-appearance: none; width: 16px; height: 16px;
          border-radius: 50%; background: #06b6d4; border: 2px solid #091628;
          box-shadow: 0 0 8px rgba(6,182,212,0.5); cursor: pointer;
          transition: transform .15s, box-shadow .15s;
        }
        .h-predict-slider::-webkit-slider-thumb:hover {
          transform: scale(1.25); box-shadow: 0 0 14px rgba(6,182,212,0.8);
        }
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .h-fadein { animation: fadeUp .35s ease both; }
        /* Sidebar mobile */
        @media (max-width: 1024px) {
          .h-sidebar { position: fixed !important; top: 0 !important; left: 0 !important;
            height: 100% !important; transform: translateX(-100%); z-index: 40; }
          .h-sidebar.open { transform: translateX(0) !important; }
          .h-close-btn { display: flex !important; }
          .h-mobile-bar { display: flex !important; }
        }
        @media (max-width: 640px) {
          .h-mobile-result { display: block !important; }
        }
      `}</style>

      <div style={{ background: "#050e1d", color: "#e8f4f8", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>

        {/* Backdrop */}
        {drawerOpen && (
          <div onClick={() => setDrawerOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 30 }} />
        )}

        {/* Mobile top bar */}
        <div className="h-mobile-bar" style={{ display: "none", position: "sticky", top: 0, zIndex: 20,
          background: "rgba(9,22,40,0.96)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0.65rem 1rem",
          alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase",
              color: "rgba(6,182,212,0.6)", marginBottom: "0.1rem" }}>Marine Intelligence</p>
            <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "#e8f4f8" }}>Fish Abundance Predictor</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {result && (
              <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "0.18rem 0.55rem",
                borderRadius: "999px", background: CAT_BG[result.category],
                border: `1px solid ${CAT_BORDER[result.category]}`, color: CAT_COLOR[result.category] }}>
                {result.fish_abundance_kg_km2} kg/km²
              </span>
            )}
            <button onClick={() => setDrawerOpen((d) => !d)}
              style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.25)",
                color: "#06b6d4", fontSize: "0.72rem", fontWeight: 600, padding: "0.4rem 0.75rem",
                borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <svg style={{ width: 13, height: 13 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Tune
            </button>
          </div>
        </div>

        <div style={{ display: "flex", position: "relative" }}>

          {/* ══ SIDEBAR ══ */}
          <aside className={`h-sidebar ${drawerOpen ? "open" : ""}`}
            style={{ background: "#091628", borderRight: "1px solid rgba(255,255,255,0.07)",
              display: "flex", flexDirection: "column", width: 300, flexShrink: 0,
              position: "sticky", top: 0, height: "100vh",
              transition: "transform .3s cubic-bezier(.4,0,.2,1)" }}>

            {/* Sidebar header */}
            <div style={{ flexShrink: 0, padding: "1rem 1.2rem",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: "0.56rem", letterSpacing: "0.18em", textTransform: "uppercase",
                  color: "rgba(6,182,212,0.55)", marginBottom: "0.18rem" }}>Configuration</p>
                <h2 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#e8f4f8" }}>Ocean Parameters</h2>
              </div>
              <button className="h-close-btn" onClick={() => setDrawerOpen(false)}
                style={{ display: "none", background: "none", border: "none",
                  color: "#4a6a82", cursor: "pointer", padding: "0.25rem",
                  alignItems: "center", justifyContent: "center" }}>
                <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable sidebar content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.1rem" }}>

              {/* Zone picker */}
              <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "14px", padding: "0.9rem", marginBottom: "0.85rem" }}>
                <p style={{ fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.14em",
                  textTransform: "uppercase", color: "#06b6d4", marginBottom: "0.6rem", opacity: 0.8 }}>
                  🌊 Quick-fill Zone
                </p>
                <div style={{ position: "relative" }}>
                  <select style={{ width: "100%", background: "rgba(0,0,0,0.25)",
                    border: "1.5px solid rgba(6,182,212,0.28)", borderRadius: "11px",
                    padding: "0.62rem 1.9rem 0.62rem 0.85rem", color: "#e8f4f8",
                    fontSize: "0.8rem", appearance: "none", cursor: "pointer", outline: "none" }}
                    value={selZone} onChange={(e) => handleZoneSelect(e.target.value)}>
                    <option value="" disabled>Select a zone…</option>
                    {Object.keys(INDIAN_OCEAN_ZONES).map((k) => (<option key={k} value={k}>{k}</option>))}
                  </select>
                  <svg style={{ position: "absolute", right: "0.65rem", top: "50%", transform: "translateY(-50%)",
                    width: 13, height: 13, color: "#06b6d4", pointerEvents: "none" }}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {zoneLoaded && selZone ? (
                  <div style={{ marginTop: "0.6rem", background: "rgba(34,197,94,0.06)",
                    border: "1px solid rgba(34,197,94,0.2)", borderRadius: "9px", padding: "0.55rem 0.7rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.2rem" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80",
                        boxShadow: "0 0 5px #4ade80", flexShrink: 0, display: "inline-block" }} />
                      <span style={{ fontSize: "0.7rem", color: "#4ade80", fontWeight: 600 }}>{selZone} — loaded</span>
                    </div>
                    <p style={{ fontSize: "0.65rem", color: "#4a6a82", lineHeight: 1.5 }}>
                      {INDIAN_OCEAN_ZONES[selZone]?.description}
                    </p>
                  </div>
                ) : (
                  <p style={{ fontSize: "0.65rem", color: "#2a4a62", marginTop: "0.45rem", lineHeight: 1.5 }}>
                    Choose a zone to auto-fill all ocean parameters below.
                  </p>
                )}
              </div>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", margin: "0.75rem 0" }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
                <span style={{ fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase",
                  color: "#2a4a62", fontWeight: 600 }}>or manually</span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
              </div>

              {/* Sliders */}
              <div>
                {PARAMS.map((p) => (
                  <SliderRow key={p.key} p={p} value={values[p.key]}
                    onChange={(v) => setValues((prev) => ({ ...prev, [p.key]: v }))} />
                ))}
              </div>

              {/* Predict button */}
              <div style={{ paddingBottom: "1.5rem", marginTop: "0.25rem" }}>
                <button onClick={() => runPredict(values, null, null)} disabled={loading}
                  style={{ width: "100%", background: "#06b6d4", border: "none", borderRadius: "12px",
                    color: "#050e1d", fontSize: "0.875rem", fontWeight: 700, padding: "0.82rem",
                    cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                    boxShadow: "0 4px 20px rgba(6,182,212,0.3)", letterSpacing: "0.02em",
                    transition: "all .15s" }}>
                  {loading ? (
                    <>
                      <span style={{ width: 15, height: 15, border: "2px solid rgba(5,14,29,0.25)",
                        borderTopColor: "#050e1d", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
                      Predicting…
                    </>
                  ) : (
                    <>
                      <svg style={{ width: 15, height: 15 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="11" cy="11" r="8" />
                        <path strokeLinecap="round" d="m21 21-4.35-4.35" />
                      </svg>
                      Predict Fish Abundance
                    </>
                  )}
                </button>

                {error && (
                  <div style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: "10px", padding: "0.6rem 0.8rem", fontSize: "0.72rem",
                    color: "#fca5a5", marginTop: "0.6rem", lineHeight: 1.5 }}>
                    ⚠️ {error}
                  </div>
                )}

                {result && (
                  <div style={{ marginTop: "0.6rem" }} className="h-fadein">
                    <ResultCard result={result} compact />
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* ══ MAIN ══ */}
          <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>

            {/* MAP */}
            <section style={{ padding: "1.25rem 1.25rem 0.75rem" }}>
              <div style={{ background: "#091628", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "18px", overflow: "hidden" }}>
                {/* Map header */}
                <div style={{ padding: "0.75rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.07)",
                  display: "flex", flexWrap: "wrap", alignItems: "center",
                  justifyContent: "space-between", gap: "0.5rem" }}>
                  <div>
                    <p style={{ fontSize: "0.56rem", letterSpacing: "0.18em", textTransform: "uppercase",
                      color: "rgba(6,182,212,0.55)", marginBottom: "0.12rem" }}>Exclusive Economic Zone</p>
                    <h2 style={{ fontSize: "0.88rem", fontWeight: 700, color: "#e8f4f8" }}>
                      Indian EEZ — Fish Abundance Map
                    </h2>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                    {Object.entries(CAT_DOT).map(([k, v]) => (
                      <div key={k} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: v,
                          boxShadow: `0 0 5px ${v}`, flexShrink: 0, display: "inline-block" }} />
                        <span style={{ fontSize: "0.72rem", color: "#8fb4cc" }}>{k}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Leaflet */}
                <div style={{ height: 420, width: "100%" }}>
                  <MapContainer center={mapCenter} zoom={mapZoom}
                    style={{ height: "100%", width: "100%" }} scrollWheelZoom>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                      attribution='&copy; <a href="https://carto.com/">CARTO</a>' />
                    <MapController center={mapCenter} zoom={mapZoom} />
                    {zoneMarker && (
                      <CircleMarker center={[zoneMarker.lat, zoneMarker.lng]} radius={16}
                        pathOptions={{ color: ZONE_HEALTH_COLOR[zoneMarker.health] ?? "#06b6d4",
                          fillColor: ZONE_HEALTH_COLOR[zoneMarker.health] ?? "#06b6d4",
                          fillOpacity: 0.25, weight: 2 }}>
                        <Popup><strong>{zoneMarker.name}</strong><br />
                          <span style={{ fontSize: 12, color: "#94a3b8" }}>{zoneMarker.desc}</span></Popup>
                      </CircleMarker>
                    )}
                    {inputLatLng && result && (
                      <CircleMarker center={inputLatLng} radius={11}
                        pathOptions={{ color: "#fff", fillColor: CAT_COLOR[result.category], fillOpacity: 1, weight: 2 }}>
                        <Popup><strong>Prediction</strong><br />{result.fish_abundance_kg_km2} kg/km²</Popup>
                      </CircleMarker>
                    )}
                  </MapContainer>
                </div>
              </div>
            </section>

            {/* Mobile result */}
            {result && (
              <section ref={resultRef} className="h-mobile-result" style={{ display: "none", padding: "0 1.25rem 0" }}>
                <div style={{ background: "#091628", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "16px", padding: "1rem" }} className="h-fadein">
                  <p style={{ fontSize: "0.56rem", fontWeight: 700, letterSpacing: "0.14em",
                    textTransform: "uppercase", color: "#4a6a82", marginBottom: "0.7rem" }}>Latest Prediction</p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.7rem" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
                      <span style={{ fontSize: "1.8rem", fontWeight: 800, fontFamily: "monospace",
                        color: "#e8f4f8", letterSpacing: "-0.02em" }}>
                        <AnimatedNumber value={result.fish_abundance_kg_km2} decimals={2} />
                      </span>
                      <span style={{ fontSize: "0.72rem", color: "#4a6a82" }}>kg/km²</span>
                    </div>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "0.2rem 0.6rem",
                      borderRadius: "999px", background: CAT_BG[result.category],
                      border: `1px solid ${CAT_BORDER[result.category]}`, color: CAT_COLOR[result.category] }}>
                      {result.category}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.4rem" }}>
                    {[["RF", result.rf_prediction], ["XGB", result.xgb_prediction], ["Ensemble", result.fish_abundance_kg_km2]].map(([label, val]) => (
                      <div key={label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "8px",
                        padding: "0.4rem", textAlign: "center" }}>
                        <p style={{ fontSize: "0.52rem", color: "#4a6a82", textTransform: "uppercase",
                          letterSpacing: "0.08em", marginBottom: "0.18rem" }}>{label}</p>
                        <p style={{ fontFamily: "monospace", fontSize: "0.68rem", fontWeight: 600, color: "#8fb4cc" }}>{val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* CHARTS */}
            <section style={{ padding: "0.75rem 1.25rem 2.5rem" }}>
              {histLoading ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  {[1, 2].map((i) => <SkeletonCard key={i} />)}
                </div>
              ) : history.length === 0 ? (
                <div style={{ background: "#091628", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "18px" }}>
                  <EmptyState icon="🐟" message="No predictions yet — run your first analysis above" />
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "1rem" }}>
                  {/* Chart 1 */}
                  <div style={{ background: "#091628", border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "18px", padding: "1.1rem 1.2rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.9rem" }}>
                      <span style={{ width: 3, height: 14, background: "#06b6d4", borderRadius: "2px",
                        display: "inline-block", boxShadow: "0 0 5px #06b6d4" }} />
                      <p style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.14em",
                        textTransform: "uppercase", color: "#4a6a82" }}>Temp vs Abundance</p>
                    </div>
                    <TempAbundanceChart key={`t-${history.length}`} history={history} />
                  </div>
                  {/* Chart 2 */}
                  <div style={{ background: "#091628", border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "18px", padding: "1.1rem 1.2rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.9rem" }}>
                      <span style={{ width: 3, height: 14, background: "#22c55e", borderRadius: "2px",
                        display: "inline-block", boxShadow: "0 0 5px #22c55e" }} />
                      <p style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.14em",
                        textTransform: "uppercase", color: "#4a6a82" }}>Monthly Distribution</p>
                    </div>
                    <MonthlyDistributionChart key={`m-${history.length}`} history={history} />
                  </div>
                </div>
              )}
            </section>

          </main>
        </div>
      </div>
    </>
  );
}