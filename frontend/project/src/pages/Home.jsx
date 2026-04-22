import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { TempAbundanceChart, MonthlyDistributionChart } from "../components/Charts";
import { predictFish, getHistory } from "../services/api";
import { useAuth } from "../context/AuthContext";
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

// ── Parameter config ──────────────────────────────────────────────────────────
const PARAMS = [
  { key: "temperature",  label: "Sea Surface Temp",  unit: "°C",    min: 0,  max: 40,   step: 0.1, default: 27  },
  { key: "salinity",     label: "Salinity",           unit: "PSU",   min: 0,  max: 45,   step: 0.1, default: 33  },
  { key: "oxygen",       label: "Dissolved Oxygen",  unit: "mg/L",  min: 0,  max: 15,   step: 0.1, default: 6   },
  { key: "chlorophyll",  label: "Chlorophyll-a",     unit: "mg/m³", min: 0,  max: 20,   step: 0.01,default: 1.5 },
  { key: "month",        label: "Month (1–12)",      unit: "",      min: 1,  max: 12,   step: 1,   default: 6   },
  { key: "depth",        label: "Depth",             unit: "m",     min: 1,  max: 1000, step: 1,   default: 100 },
];
const MONTH_NAMES = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const CAT_COLOR   = { High: "#2e7d32", Medium: "#f57f17", Low: "#c62828" };

export default function Home() {
  const { user } = useAuth();
  const isFisherman = user?.role === "fisherman";

  const [values,      setValues]      = useState(Object.fromEntries(PARAMS.map(p => [p.key, p.default])));
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [history,     setHistory]     = useState([]);
  const [mapCenter,   setMapCenter]   = useState([15, 80]);
  const [mapZoom,     setMapZoom]     = useState(5);
  const [mapPoints,   setMapPoints]   = useState([]);
  const [inputLatLng, setInputLatLng] = useState(null);
  const [selectedZone,setSelectedZone]= useState("");
  const [zoneLoaded,  setZoneLoaded]  = useState(false);
  const [zoneMarker,  setZoneMarker]  = useState(null);

  useEffect(() => {
    getHistory().then(setHistory).catch(() => {});
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
      month:       v.month,   // keep user's month
      depth:       z.depth,
    }));
    setMapCenter([z.lat, z.lng]);
    setMapZoom(z.zoom);
    setZoneMarker({ lat: z.lat, lng: z.lng, name: zoneName,
                    desc: z.description, health: z.healthLevel });
    setZoneLoaded(true);

    // Fisherman: auto-predict on zone select
    if (isFisherman) {
      await runPredict({ temperature: z.temp, salinity: z.salinity,
        oxygen: z.oxygen, chlorophyll: z.chlorophyll,
        month: values.month, depth: z.depth }, z.lat, z.lng);
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
    } catch (e) {
      setError(e.response?.data?.error || "Prediction failed. Is Flask running?");
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
          {zone && (
            <p className="zone-description">📍 {zone.description}</p>
          )}
        </div>

        {loading && (
          <div className="simple-result-card">
            <div className="big-spinner" style={{ margin: "0 auto" }} />
            <p style={{ color: "#90caf9", marginTop: ".8rem" }}>Checking zone…</p>
          </div>
        )}

        {result && !loading && (
          <div className="simple-result-card">
            <p className="simple-result-zone">Zone: {selectedZone}</p>
            <div className="simple-result-status"
              style={{ color: CAT_COLOR[result.category] }}>
              {result.category === "High"   && "🟢 HIGH Fish Availability"}
              {result.category === "Medium" && "🟡 MODERATE Fish Availability"}
              {result.category === "Low"    && "🔴 LOW Fish Availability"}
            </div>
            <p className="simple-result-desc">
              Predicted abundance: <strong>{result.fish_abundance_kg_km2} kg/km²</strong>
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
        {error && <div className="eco-error" style={{ marginTop: "1rem" }}>⚠️ {error}</div>}
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
                {p.label}
                <span className="slider-value">
                  {p.key === "month" ? MONTH_NAMES[values[p.key]] : values[p.key]}{p.unit}
                </span>
              </label>
              <input type="range" min={p.min} max={p.max} step={p.step}
                value={values[p.key]}
                onChange={e => setValues(v => ({ ...v, [p.key]: Number(e.target.value) }))} />
              <div className="slider-range"><span>{p.min}</span><span>{p.max}</span></div>
            </div>
          ))}
          <button className="btn-predict" onClick={handlePredict} disabled={loading}>
            {loading ? "⏳ Predicting…" : "🔍 Predict Fish Abundance"}
          </button>
          {error && <div className="error-box">{error}</div>}
        </div>

        {/* Result card */}
        {result && (
          <div className="result-card" style={{ borderLeft: `6px solid ${CAT_COLOR[result.category]}` }}>
            <h2>Prediction Result</h2>
            <div className="result-main">
              <span className="result-value">{result.fish_abundance_kg_km2}</span>
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
            {Object.entries(CAT_COLOR).map(([k,v]) => (
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
                }}
              >
                <Popup>
                  <b>{zoneMarker.name}</b><br />
                  {zoneMarker.desc}
                </Popup>
              </CircleMarker>
            )}

            {/* Latest prediction marker */}
            {inputLatLng && result && (
              <CircleMarker center={inputLatLng} radius={14}
                pathOptions={{ color: "#fff",
                  fillColor: CAT_COLOR[result.category],
                  fillOpacity: 1, weight: 3 }}>
                <Popup>
                  <b>Your Prediction</b><br />
                  {result.fish_abundance_kg_km2} kg/km²
                </Popup>
              </CircleMarker>
            )}
          </MapContainer>
        </div>

        {/* Charts */}
        {history.length > 0 && (
          <div className="charts-section">
            <TempAbundanceChart    key={`t-${history.length}`} history={history} />
            <MonthlyDistributionChart key={`m-${history.length}`} history={history} />
          </div>
        )}
        {history.length === 0 && (
          <p className="chart-hint">Make a prediction to populate the charts!</p>
        )}
      </div>
    </div>
  );
}