import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { Chart, registerables } from "chart.js";
import "leaflet/dist/leaflet.css";
import {
  assessEcosystem, getEcosystemHistory,
  getEcosystemZones, deleteEcosystemRecord,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import INDIAN_OCEAN_ZONES, { ZONE_HEALTH_COLOR } from "../data/oceanZones";
import "../styles/EcosystemHealth.css";

Chart.register(...registerables);

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
  { key: "temperature",  label: "Sea Surface Temp",    unit: "°C",     min: 15,  max: 40,  step: 0.1,  default: 27,  optimal: "25–28°C" },
  { key: "salinity",     label: "Salinity",             unit: "PSU",    min: 20,  max: 42,  step: 0.1,  default: 34,  optimal: "33–35 PSU" },
  { key: "dissolved_o2", label: "Dissolved Oxygen",    unit: "mg/L",   min: 0,   max: 15,  step: 0.1,  default: 6.5, optimal: "6–8 mg/L" },
  { key: "chlorophyll",  label: "Chlorophyll-a",       unit: "mg/m³",  min: 0,   max: 20,  step: 0.1,  default: 1.5, optimal: "0.5–2 mg/m³" },
  { key: "ph",           label: "pH Level",             unit: "",       min: 7.0, max: 8.8, step: 0.01, default: 8.1, optimal: "8.0–8.3" },
  { key: "nitrate",      label: "Nitrate",              unit: "µmol/L", min: 0,   max: 50,  step: 0.1,  default: 5,   optimal: "< 5 µmol/L" },
  { key: "fish_index",   label: "Fish Abundance Index", unit: "",       min: 0,   max: 100, step: 1,    default: 60,  optimal: "> 60" },
  { key: "biodiversity", label: "Biodiversity Index",   unit: "",       min: 0,   max: 100, step: 1,    default: 65,  optimal: "> 60" },
];

const CAT_COLOR = { Healthy: "#2e7d32", Moderate: "#f57f17", Critical: "#c62828" };
const CAT_ICON  = { Healthy: "🟢", Moderate: "🟡", Critical: "🔴" };
const MONTHS    = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function EcosystemHealth() {
  const { user } = useAuth();
  const isPolicymaker = user?.role === "policymaker";

  const [values,      setValues]      = useState(Object.fromEntries(PARAMS.map(p => [p.key, p.default])));
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [history,     setHistory]     = useState([]);
  const [zones,       setZones]       = useState([]);
  const [deleting,    setDeleting]    = useState(null);
  const [showHist,    setShowHist]    = useState(false);
  const [selectedZone,setSelectedZone]= useState("");
  const [zoneLoaded,  setZoneLoaded]  = useState(false);
  const [zoneMarker,  setZoneMarker]  = useState(null);
  const [mapCenter,   setMapCenter]   = useState([15, 78]);
  const [mapZoom,     setMapZoom]     = useState(5);

  const gaugeRef  = useRef(); const gaugeChart  = useRef();
  const impactRef = useRef(); const impactChart = useRef();
  const trendRef  = useRef(); const trendChart  = useRef();

  useEffect(() => {
    getEcosystemZones().then(setZones).catch(() => {});
  }, []);

  const loadHistory = () =>
    getEcosystemHistory().then(setHistory).catch(() => {});

  const toggleHistory = () => {
    if (!showHist) loadHistory();
    setShowHist(v => !v);
  };

  // ── Zone selection ────────────────────────────────────────────────────────
  const handleZoneSelect = async (zoneName) => {
    setSelectedZone(zoneName);
    setZoneLoaded(false);
    setResult(null);
    setError("");
    if (!zoneName || !INDIAN_OCEAN_ZONES[zoneName]) return;

    const z = INDIAN_OCEAN_ZONES[zoneName];
    setValues({
      temperature:  z.temp,
      salinity:     z.salinity,
      dissolved_o2: z.dissolved_o2,
      chlorophyll:  z.chlorophyll,
      ph:           z.ph,
      nitrate:      z.nitrate,
      fish_index:   z.fish_index,
      biodiversity: z.biodiversity,
    });
    setMapCenter([z.lat, z.lng]);
    setMapZoom(z.zoom);
    setZoneMarker({ lat: z.lat, lng: z.lng, name: zoneName,
                    desc: z.description, health: z.healthLevel });
    setZoneLoaded(true);

    // Policymaker: auto-assess on zone select
    if (isPolicymaker) {
      await runAssess({
        temperature: z.temp, salinity: z.salinity, dissolved_o2: z.dissolved_o2,
        chlorophyll: z.chlorophyll, ph: z.ph, nitrate: z.nitrate,
        fish_index: z.fish_index, biodiversity: z.biodiversity,
      }, z.lat, z.lng);
    }
  };

  // ── Assess ────────────────────────────────────────────────────────────────
  const runAssess = async (params, lat, lng) => {
    setLoading(true); setError("");
    try {
      const useLat = lat ?? parseFloat((15 + (Math.random()-0.5)*14).toFixed(4));
      const useLng = lng ?? parseFloat((78 + (Math.random()-0.5)*20).toFixed(4));
      const res = await assessEcosystem({ ...params, latitude: useLat, longitude: useLng });
      setResult(res);
      getEcosystemZones().then(setZones).catch(() => {});
    } catch (e) {
      setError(e.response?.data?.error || "Assessment failed. Is Flask running?");
    } finally {
      setLoading(false);
    }
  };

  const handleAssess = () => runAssess(values, null, null);

  // ── Charts ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!result || !gaugeRef.current) return;
    gaugeChart.current?.destroy();
    gaugeChart.current = new Chart(gaugeRef.current, {
      type: "doughnut",
      data: { datasets: [{ data: [result.health_score, 100 - result.health_score],
        backgroundColor: [CAT_COLOR[result.category], "#1e3a5a"],
        borderWidth: 0, circumference: 180, rotation: 270 }] },
      options: { responsive: true, cutout: "75%",
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        animation: { duration: 800 } },
    });
    if (!impactRef.current) return;
    impactChart.current?.destroy();
    const labels = Object.keys(result.parameter_impacts).map(k => k.replace("_"," "));
    const vals   = Object.values(result.parameter_impacts);
    impactChart.current = new Chart(impactRef.current, {
      type: "bar",
      data: { labels, datasets: [{ label: "Score (0–100)", data: vals,
        backgroundColor: vals.map(v => v>=71?"#2e7d32":v>=41?"#f57f17":"#c62828"),
        borderRadius: 6 }] },
      options: { indexAxis: "y", responsive: true, animation: false,
        plugins: { legend: { display: false },
          title: { display: true, text: "Parameter Health Scores", color: "#e0e6ed" } },
        scales: { x: { min:0, max:100, ticks:{color:"#90caf9"}, grid:{color:"#1e3a5a"} },
                  y: { ticks:{color:"#90caf9"}, grid:{color:"#1e3a5a"} } } },
    });
  }, [result]);

  useEffect(() => {
    if (!showHist || !history.length || !trendRef.current) return;
    trendChart.current?.destroy();
    const sorted = [...history].sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
    trendChart.current = new Chart(trendRef.current, {
      type: "line",
      data: { labels: sorted.map(r=>{const d=new Date(r.createdAt);return`${d.getDate()} ${MONTHS[d.getMonth()]}`;}),
        datasets:[{ label:"Health Score", data:sorted.map(r=>r.health_score),
          borderColor:"#1e90ff", backgroundColor:"rgba(30,144,255,.15)",
          tension:0.4, fill:true, pointRadius:5,
          pointBackgroundColor:sorted.map(r=>CAT_COLOR[r.category]??"#1e90ff") }] },
      options:{ responsive:true, plugins:{legend:{display:false},
        title:{display:true,text:"Health Score Trend",color:"#e0e6ed"}},
        scales:{y:{min:0,max:100,ticks:{color:"#90caf9"},grid:{color:"#1e3a5a"}},
                x:{ticks:{color:"#90caf9"},grid:{color:"#1e3a5a"}}} },
    });
  }, [history, showHist]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    setDeleting(id);
    await deleteEcosystemRecord(id).catch(()=>{});
    setHistory(h=>h.filter(r=>r._id!==id));
    setDeleting(null);
  };

  const exportCSV = () => {
    const h = ["Date","Score","Category","Temp","Salinity","O2","Chl-a","pH","Nitrate","Fish","Bio"];
    const rows = history.map(r=>[
      new Date(r.createdAt).toLocaleString(),
      r.health_score, r.category,
      r.parameters?.temperature, r.parameters?.salinity,
      r.parameters?.dissolved_o2, r.parameters?.chlorophyll,
      r.parameters?.ph, r.parameters?.nitrate,
      r.parameters?.fish_index, r.parameters?.biodiversity,
    ]);
    const csv=[h,...rows].map(r=>r.join(",")).join("\n");
    const a=document.createElement("a");
    a.href=`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    a.download="ecosystem_health.csv"; a.click();
  };

  // ── Policymaker simplified view ───────────────────────────────────────────
  if (isPolicymaker) {
    const zone = selectedZone ? INDIAN_OCEAN_ZONES[selectedZone] : null;
    return (
      <div style={{ maxWidth: 700, margin: "2rem auto", padding: "0 1rem" }}>
        <div className="eco-header">
          <h1>🌊 Marine Ecosystem Health</h1>
          <p>Select a zone to assess ecosystem health</p>
        </div>

        <div className="zone-selector-wrap">
          <span className="zone-selector-label">🗺️ Select Indian Ocean Zone</span>
          <select className="zone-select" value={selectedZone}
            onChange={e => handleZoneSelect(e.target.value)}>
            <option value="">Select a zone to assess…</option>
            {Object.keys(INDIAN_OCEAN_ZONES).map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          {zone && <p className="zone-description">📍 {zone.description}</p>}
        </div>

        {loading && (
          <div className="simple-result-card">
            <div className="eco-spinner" style={{ margin: "0 auto" }} />
            <p style={{ color: "#90caf9", marginTop: ".8rem" }}>Assessing zone…</p>
          </div>
        )}

        {result && !loading && (
          <div className="simple-result-card">
            <p className="simple-result-zone">Zone: {selectedZone}</p>
            <div className="gauge-wrapper" style={{ width: 200, margin: "0 auto" }}>
              <canvas ref={gaugeRef} />
              <div className="gauge-center">
                <span className="gauge-score">{result.health_score}</span>
                <span className="gauge-label">/ 100</span>
              </div>
            </div>
            <div className="cat-badge" style={{ background: CAT_COLOR[result.category], margin: ".6rem auto", display: "inline-block" }}>
              {CAT_ICON[result.category]} {result.category}
            </div>
            <div className="simple-result-tip">
              {result.category === "Healthy"  && "✅ This zone is HEALTHY — Fishing operations allowed"}
              {result.category === "Moderate" && "⚠️ This zone is MODERATE — Limit fishing activity"}
              {result.category === "Critical" && "🚨 This zone is CRITICAL — Fishing ban advised"}
            </div>
            <div style={{ marginTop: "1rem" }}>
              {result.recommendations?.map((r, i) => (
                <p key={i} style={{ fontSize: ".85rem", color: "#b0bec5",
                  padding: ".4rem .8rem", background: "#0d1b2a",
                  borderRadius: "8px", marginBottom: ".4rem" }}>{r}</p>
              ))}
            </div>
          </div>
        )}
        {error && <div className="eco-error" style={{ marginTop: "1rem" }}>⚠️ {error}</div>}
      </div>
    );
  }

  // ── Scientist / PhD full view ─────────────────────────────────────────────
  return (
    <div className="eco-page">
      <div className="eco-header">
        <h1>🌊 Marine Ecosystem Health</h1>
        <p>Assess ocean health using multi-parameter analysis for Indian EEZ waters</p>
      </div>

      <div className="eco-main-grid">
        {/* Left: Input */}
        <div className="eco-input-col">
          <div className="eco-card">

            {/* Zone selector */}
            <div className="zone-selector-wrap" style={{ margin: "0 0 1rem 0" }}>
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
                  <button className="btn-auto-assess"
                    onClick={() => runAssess(values,
                      INDIAN_OCEAN_ZONES[selectedZone]?.lat,
                      INDIAN_OCEAN_ZONES[selectedZone]?.lng)}
                    disabled={loading}>
                    {loading ? "⏳ Assessing…" : "⚡ Auto-Assess This Zone"}
                  </button>
                </>
              )}
            </div>

            <div className="or-divider">OR enter manually</div>

            <h3>Ocean Parameters</h3>
            {PARAMS.map(p => (
              <div className="eco-slider-row" key={p.key}>
                <div className="eco-slider-label">
                  <span>{p.label}</span>
                  <span className="eco-slider-val">{values[p.key]}{p.unit}</span>
                </div>
                <input type="range" min={p.min} max={p.max} step={p.step}
                  value={values[p.key]}
                  onChange={e => setValues(v => ({ ...v, [p.key]: Number(e.target.value) }))} />
                <div className="eco-slider-meta">
                  <span>{p.min}{p.unit}</span>
                  <span className="optimal">Optimal: {p.optimal}</span>
                  <span>{p.max}{p.unit}</span>
                </div>
              </div>
            ))}

            <button className="btn-assess" onClick={handleAssess} disabled={loading}>
              {loading ? "⏳ Assessing…" : "🔬 Assess Ecosystem Health"}
            </button>
            {error && <div className="eco-error">{error}</div>}
          </div>
        </div>

        {/* Right: Result */}
        <div className="eco-result-col">
          {!result && !loading && (
            <div className="eco-placeholder">
              <span>🌊</span>
              <p>Select a zone or set parameters<br />and click "Assess Ecosystem Health"</p>
            </div>
          )}
          {loading && (
            <div className="eco-placeholder">
              <div className="eco-spinner" />
              <p>Analysing ecosystem parameters…</p>
            </div>
          )}
          {result && (
            <>
              <div className="eco-card gauge-card">
                <h3>Ecosystem Health Score</h3>
                <div className="gauge-wrapper">
                  <canvas ref={gaugeRef} />
                  <div className="gauge-center">
                    <span className="gauge-score">{result.health_score}</span>
                    <span className="gauge-label">/ 100</span>
                  </div>
                </div>
                <div className="cat-badge" style={{ background: CAT_COLOR[result.category] }}>
                  {CAT_ICON[result.category]} {result.category}
                </div>
                <div className="eco-meta-row">
                  <span>Method: {result.method}</span>
                  {result.ml_confidence > 0 &&
                    <span>ML Confidence: {result.ml_confidence}%</span>}
                </div>
              </div>

              <div className="eco-card"><canvas ref={impactRef} /></div>

              <div className="eco-card">
                <h3>📋 Recommendations</h3>
                <ul className="rec-list">
                  {result.recommendations?.map((r, i) => (
                    <li key={i} className={
                      r.startsWith("🚨")?"rec-critical":
                      r.startsWith("⚠️")?"rec-warning":"rec-ok"}>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="eco-card eco-map-section">
        <h3>🗺️ Indian Ocean — Zone Health Map</h3>
        <div className="map-legend">
          {Object.entries(CAT_COLOR).map(([k,v]) => (
            <span key={k}><span className="dot" style={{ background: v }} /> {k}</span>
          ))}
        </div>
        <MapContainer center={mapCenter} zoom={mapZoom}
          style={{ height: "400px", borderRadius: "12px" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap' />
          <MapController center={mapCenter} zoom={mapZoom} />

          {/* Selected zone pulsing marker */}
          {zoneMarker && (
            <CircleMarker
              center={[zoneMarker.lat, zoneMarker.lng]}
              radius={22}
              pathOptions={{
                color: ZONE_HEALTH_COLOR[zoneMarker.health] ?? "#1e90ff",
                fillColor: ZONE_HEALTH_COLOR[zoneMarker.health] ?? "#1e90ff",
                fillOpacity: 0.3, weight: 3,
              }}>
              <Popup><b>{zoneMarker.name}</b><br />{zoneMarker.desc}</Popup>
            </CircleMarker>
          )}

          {/* Past assessment zones */}
          {zones.map((z, i) => (
            <CircleMarker key={i} center={[z.latitude, z.longitude]} radius={9}
              pathOptions={{ color: CAT_COLOR[z.category]??"#607d8b",
                fillOpacity: 0.75, weight: 0 }}>
              <Popup>
                <b>{z.zone_name||"Assessment Zone"}</b><br />
                Score: <b>{z.health_score}</b><br />
                <span style={{color:CAT_COLOR[z.category]}}>{z.category}</span><br />
                {new Date(z.createdAt).toLocaleString()}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* History */}
      <div className="eco-history-section">
        <button className="btn-toggle" onClick={toggleHistory}>
          {showHist ? "▲ Hide History" : "▼ Show Assessment History"}
        </button>
        {showHist && (
          <div className="eco-card" style={{ marginTop: "1rem" }}>
            <div className="history-header">
              <h3>Assessment History ({history.length})</h3>
              {history.length > 0 &&
                <button className="btn-export" onClick={exportCSV}>⬇ Export CSV</button>}
            </div>
            {history.length > 1 && (
              <div style={{ marginBottom: "1.5rem" }}>
                <canvas ref={trendRef} />
              </div>
            )}
            {history.length === 0
              ? <p style={{ color:"#607d8b", textAlign:"center", padding:"2rem" }}>No assessments yet.</p>
              : <div className="eco-table-scroll">
                  <table className="eco-table">
                    <thead>
                      <tr>
                        <th>#</th><th>Date</th><th>Score</th><th>Category</th>
                        <th>Temp</th><th>O₂</th><th>Chl-a</th><th>pH</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((r,i) => (
                        <tr key={r._id}>
                          <td>{i+1}</td>
                          <td>{new Date(r.createdAt).toLocaleString()}</td>
                          <td><strong>{r.health_score}</strong></td>
                          <td><span className="badge"
                            style={{background:CAT_COLOR[r.category]}}>{r.category}</span></td>
                          <td>{r.parameters?.temperature??"-"}</td>
                          <td>{r.parameters?.dissolved_o2??"-"}</td>
                          <td>{r.parameters?.chlorophyll??"-"}</td>
                          <td>{r.parameters?.ph??"-"}</td>
                          <td>
                            <button className="btn-delete"
                              onClick={()=>handleDelete(r._id)}
                              disabled={deleting===r._id}>
                              {deleting===r._id?"…":"✕"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            }
          </div>
        )}
      </div>
    </div>
  );
}