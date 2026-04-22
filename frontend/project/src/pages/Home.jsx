import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import toast from "react-hot-toast";
import { TempAbundanceChart, MonthlyDistributionChart } from "../components/Charts";
import { predictFish, getHistory } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  TooltipIcon, SkeletonCard, EmptyState,
  AnimatedNumber, abundanceBorder,
} from "../components/UI";
import INDIAN_OCEAN_ZONES, { ZONE_HEALTH_COLOR } from "../data/oceanZones";
import "leaflet/dist/leaflet.css";

// ── Map fly-to helper ─────────────────────────────────────────────────────────
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom, { animate: true, duration: 1.5 });
  }, [center, zoom]);
  return null;
}

// ── Tooltips ──────────────────────────────────────────────────────────────────
const PARAM_TOOLTIPS = {
  temperature: "Temperature of ocean surface water in Celsius",
  salinity:    "Amount of dissolved salts in seawater (PSU)",
  oxygen:      "Oxygen dissolved in water (mg/L). Fish need > 5 mg/L",
  chlorophyll: "Phytoplankton measure — more = more fish food (mg/m³)",
  month:       "Current month affects fish migration patterns",
  depth:       "Water depth in meters where fish are found",
};

// ── Parameter config ──────────────────────────────────────────────────────────
const PARAMS = [
  { key: "temperature",  label: "Sea Surface Temp",  unit: "°C",    min: 0,  max: 40,   step: 0.1,  default: 27  },
  { key: "salinity",     label: "Salinity",           unit: "PSU",   min: 0,  max: 45,   step: 0.1,  default: 33  },
  { key: "oxygen",       label: "Dissolved Oxygen",   unit: "mg/L",  min: 0,  max: 15,   step: 0.1,  default: 6   },
  { key: "chlorophyll",  label: "Chlorophyll-a",      unit: "mg/m³", min: 0,  max: 20,   step: 0.01, default: 1.5 },
  { key: "month",        label: "Month (1–12)",       unit: "",      min: 1,  max: 12,   step: 1,    default: 6   },
  { key: "depth",        label: "Depth",              unit: "m",     min: 1,  max: 1000, step: 1,    default: 100 },
];
const MONTH_NAMES = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const CAT_COLOR   = { High: "#2e7d32", Medium: "#f57f17", Low: "#c62828" };

export default function Home() {
  const { user } = useAuth();
  const isFisherman = user?.role === "fisherman";

  const [values,       setValues]       = useState(Object.fromEntries(PARAMS.map(p => [p.key, p.default])));
  const [result,       setResult]       = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [history,      setHistory]      = useState([]);
  const [histLoading,  setHistLoading]  = useState(false);
  const [mapCenter,    setMapCenter]    = useState([15, 80]);
  const [mapZoom,      setMapZoom]      = useState(5);
  const [inputLatLng,  setInputLatLng]  = useState(null);
  const [selectedZone, setSelectedZone] = useState("");
  const [zoneLoaded,   setZoneLoaded]   = useState(false);
  const [zoneMarker,   setZoneMarker]   = useState(null);
  const resultRef = useRef();

  useEffect(() => {
    setHistLoading(true);
    getHistory()
      .then(setHistory)
      .catch(() => {})
      .finally(() => setHistLoading(false));
  }, [result]);

  // Scroll to result when it appears
  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [result]);

  // ── Zone selection ────────────────────────────────────────────────────────
  const handleZoneSelect = async (zoneName) => {
    setSelectedZone(zoneName);
    setZoneLoaded(false);
    setResult(null);
    setError("");
    if (!zoneName || !INDIAN_OCEAN_ZONES[zoneName]) return;

    const z = INDIAN_OCEAN_ZONES[zoneName];
    setValues(v => ({
      ...v,
      temperature: z.temp,
      salinity:    z.salinity,
      oxygen:      z.oxygen,
      chlorophyll: z.chlorophyll,
      depth:       z.depth,
    }));
    setMapCenter([z.lat, z.lng]);
    setMapZoom(z.zoom);
    setZoneMarker({ lat: z.lat, lng: z.lng, name: zoneName,
                    desc: z.description, health: z.healthLevel });
    setZoneLoaded(true);
    toast.success(`${zoneName} loaded!`);

    if (isFisherman) {
      await runPredict({
        temperature: z.temp, salinity: z.salinity,
        oxygen: z.oxygen,    chlorophyll: z.chlorophyll,
        month:  values.month, depth: z.depth,
      }, z.lat, z.lng);
    }
  };

  // ── Predict ───────────────────────────────────────────────────────────────
  const runPredict = async (params, lat, lng) => {
    setLoading(true); setError("");
    try {
      const useLat = lat ?? (15 + (Math.random() - 0.5) * 14);
      const useLng = lng ?? (80 + (Math.random() - 0.5) * 20);
      const res = await predictFish({ ...params, latitude: useLat, longitude: useLng });
      setResult(res);
      setInputLatLng([useLat, useLng]);
      toast.success("Fish abundance predicted!");
    } catch (e) {
      const msg = e.response?.data?.error || "Prediction failed. Try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePredict = () => runPredict(values, null, null);

  // ── Fisherman simplified view ─────────────────────────────────────────────
  if (isFisherman) {
    const zone = selectedZone ? INDIAN_OCEAN_ZONES[selectedZone] : null;
    return (
      <div style={{ maxWidth: 600, margin: "2rem auto", padding: "0 1rem" }}>
        <div className="zone-selector-wrap">
          <span className="zone-selector-label">🎣 Select your fishing zone</span>
          <select className="zone-select" value={selectedZone}
            onChange={e => handleZoneSelect(e.target.value)}>
            <option value="">Select an Indian Ocean zone…</option>
            {Object.keys(INDIAN_OCEAN_ZONES).map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          {zone && <p className="zone-description">📍 {zone.description}</p>}
        </div>

        {loading && (
          <div className="simple-result-card">
            <div className="eco-spinner" style={{ margin: "0 auto" }} />
            <p style={{ color: "#90caf9", marginTop: ".8rem" }}>Checking zone…</p>
          </div>
        )}

        {result && !loading && (
          <div className="simple-result-card" ref={resultRef}>
            <p className="simple-result-zone">Zone: {selectedZone}</p>
            <div className="simple-result-status"
              style={{ color: CAT_COLOR[result.category] }}>
              {result.category === "High"   && "🟢 HIGH Fish Availability"}
              {result.category === "Medium" && "🟡 MODERATE Fish Availability"}
              {result.category === "Low"    && "🔴 LOW Fish Availability"}
            </div>
            <p className="simple-result-desc">
              Predicted abundance:{" "}
              <strong><AnimatedNumber value={result.fish_abundance_kg_km2} decimals={2} /> kg/km²</strong>
            </p>
            {zone && (
              <div className="simple-result-tip">
                📍 {zone.description}<br />
                {result.category === "High"   && "✅ Recommended: Go 15–20 km offshore"}
                {result.category === "Medium" && "⚠️ Moderate — Check local weather first"}
                {result.category === "Low"    && "❌ Not recommended — Try another zone"}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="eco-error" style={{ marginTop: "1rem" }}>⚠️ {error}</div>
        )}
      </div>
    );
  }

  // ── Scientist / PhD full view ─────────────────────────────────────────────
  return (
    <div className="home-grid">
      {/* Left column */}
      <div className="left-col">

        {/* Zone selector */}
        <div className="zone-selector-wrap">
          <span className="zone-selector-label">🌊 Quick-fill Indian Ocean Zone</span>
          <select className="zone-select" value={selectedZone}
            onChange={e => handleZoneSelect(e.target.value)}>
            <option value="">Select a zone to auto-fill…</option>
            {Object.keys(INDIAN_OCEAN_ZONES).map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          {zoneLoaded && selectedZone && (
            <>
              <div className="zone-loaded-badge">✅ Zone loaded!</div>
              <p className="zone-description">
                📍 {INDIAN_OCEAN_ZONES[selectedZone]?.description}
              </p>
            </>
          )}
        </div>

        <div className="or-divider">OR enter manually</div>

        {/* Sliders */}
        <div className="pred-form">
          <h2>Ocean Parameters</h2>
          {PARAMS.map(p => (
            <div className="slider-row" key={p.key}>
              <label>
                <span style={{ display: "flex", alignItems: "center" }}>
                  {p.label}
                  <TooltipIcon text={PARAM_TOOLTIPS[p.key]} />
                </span>
                <span className="slider-value">
                  {p.key === "month" ? MONTH_NAMES[values[p.key]] : values[p.key]}{p.unit}
                </span>
              </label>
              <input type="range" min={p.min} max={p.max} step={p.step}
                value={values[p.key]}
                onChange={e => setValues(v => ({ ...v, [p.key]: Number(e.target.value) }))} />
              <div className="slider-range">
                <span>{p.min}</span><span>{p.max}</span>
              </div>
            </div>
          ))}

          <button className="btn-predict" onClick={handlePredict} disabled={loading}
            style={{ opacity: loading ? 0.75 : 1 }}>
            {loading
              ? <span style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"center" }}>
                  <span className="spinner" /> Predicting…
                </span>
              : "🔍 Predict Fish Abundance"}
          </button>
        </div>

        {/* Result card */}
        {result && (
          <div ref={resultRef} className="result-card"
            style={{
              borderLeft: `6px solid ${abundanceBorder(result.fish_abundance_kg_km2)}`,
              opacity: 1, transform: "translateY(0)", transition: "all .4s ease",
            }}>
            <h2>Prediction Result</h2>
            <div className="result-main">
              <span className="result-value">
                <AnimatedNumber value={result.fish_abundance_kg_km2} decimals={2} />
              </span>
              <span className="result-unit">kg / km²</span>
            </div>
            <div className="result-badge" style={{ background: CAT_COLOR[result.category] }}>
              {result.category} Abundance
            </div>
            <div className="model-breakdown">
              <div><span>Random Forest</span><strong>{result.rf_prediction} kg/km²</strong></div>
              <div><span>XGBoost</span><strong>{result.xgb_prediction} kg/km²</strong></div>
              <div><span>Ensemble</span><strong>{result.fish_abundance_kg_km2} kg/km²</strong></div>
            </div>
          </div>
        )}
      </div>

      {/* Right column */}
      <div className="right-col">
        {/* Map */}
        <div className="map-wrapper">
          <h2>Indian EEZ — Fish Abundance Map</h2>
          <div className="map-legend">
            {Object.entries(CAT_COLOR).map(([k, v]) => (
              <span key={k}><span className="dot" style={{ background: v }} /> {k}</span>
            ))}
          </div>
          <MapContainer center={mapCenter} zoom={mapZoom}
            style={{ height: "420px", borderRadius: "12px" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap' />
            <MapController center={mapCenter} zoom={mapZoom} />

            {/* Zone pulsing marker */}
            {zoneMarker && (
              <CircleMarker
                center={[zoneMarker.lat, zoneMarker.lng]}
                radius={18}
                pathOptions={{
                  color: ZONE_HEALTH_COLOR[zoneMarker.health] ?? "#1e90ff",
                  fillColor: ZONE_HEALTH_COLOR[zoneMarker.health] ?? "#1e90ff",
                  fillOpacity: 0.35, weight: 3,
                }}>
                <Popup>
                  <b>{zoneMarker.name}</b><br />{zoneMarker.desc}
                </Popup>
              </CircleMarker>
            )}

            {/* Prediction result marker */}
            {inputLatLng && result && (
              <CircleMarker center={inputLatLng} radius={14}
                pathOptions={{
                  color: "#fff",
                  fillColor: CAT_COLOR[result.category],
                  fillOpacity: 1, weight: 3,
                }}>
                <Popup>
                  <b>Your Prediction</b><br />
                  {result.fish_abundance_kg_km2} kg/km²
                </Popup>
              </CircleMarker>
            )}
          </MapContainer>
        </div>

        {/* Charts / history */}
        {histLoading
          ? [1, 2, 3].map(i => <SkeletonCard key={i} />)
          : history.length === 0
          ? <EmptyState icon="🐟" message="No fish predictions yet" />
          : (
            <div className="charts-section">
              <div style={{
                background: "#1a2d44", borderRadius: 14,
                padding: "1.2rem", boxShadow: "0 4px 20px rgba(0,0,0,.4)",
              }}>
                <TempAbundanceChart key={`t-${history.length}`} history={history} />
              </div>
              <div style={{
                background: "#1a2d44", borderRadius: 14,
                padding: "1.2rem", boxShadow: "0 4px 20px rgba(0,0,0,.4)",
              }}>
                <MonthlyDistributionChart key={`m-${history.length}`} history={history} />
              </div>
            </div>
          )
        }
      </div>
    </div>
  );
}