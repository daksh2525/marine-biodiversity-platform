import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { Chart, registerables } from "chart.js";
import "leaflet/dist/leaflet.css";
import {
  assessEcosystem, getEcosystemHistory,
  getEcosystemZones, deleteEcosystemRecord,
} from "../services/api";
import "../styles/EcosystemHealth.css";

Chart.register(...registerables);

// ── Parameter config ──────────────────────────────────────────────────────────
const PARAMS = [
  { key: "temperature",  label: "Sea Surface Temp",   unit: "°C",      min: 15,  max: 40,  step: 0.1, default: 27,  optimal: "25–28°C" },
  { key: "salinity",     label: "Salinity",            unit: "PSU",     min: 20,  max: 42,  step: 0.1, default: 34,  optimal: "33–35 PSU" },
  { key: "dissolved_o2", label: "Dissolved Oxygen",   unit: "mg/L",    min: 0,   max: 15,  step: 0.1, default: 6.5, optimal: "6–8 mg/L" },
  { key: "chlorophyll",  label: "Chlorophyll-a",      unit: "mg/m³",   min: 0,   max: 20,  step: 0.1, default: 1.5, optimal: "0.5–2 mg/m³" },
  { key: "ph",           label: "pH Level",            unit: "",        min: 7.0, max: 8.8, step: 0.01,default: 8.1, optimal: "8.0–8.3" },
  { key: "nitrate",      label: "Nitrate",             unit: "µmol/L",  min: 0,   max: 50,  step: 0.1, default: 5,   optimal: "< 5 µmol/L" },
  { key: "fish_index",   label: "Fish Abundance Index",unit: "",        min: 0,   max: 100, step: 1,   default: 60,  optimal: "> 60" },
  { key: "biodiversity", label: "Biodiversity Index",  unit: "",        min: 0,   max: 100, step: 1,   default: 65,  optimal: "> 60" },
];

const CAT_COLOR = { Healthy: "#2e7d32", Moderate: "#f57f17", Critical: "#c62828" };
const CAT_ICON  = { Healthy: "🟢", Moderate: "🟡", Critical: "🔴" };
const MONTHS    = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function EcosystemHealth() {
  const [values,   setValues]   = useState(Object.fromEntries(PARAMS.map(p => [p.key, p.default])));
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [history,  setHistory]  = useState([]);
  const [zones,    setZones]    = useState([]);
  const [deleting, setDeleting] = useState(null);
  const [showHist, setShowHist] = useState(false);

  const gaugeRef   = useRef(); const gaugeChart   = useRef();
  const impactRef  = useRef(); const impactChart  = useRef();
  const trendRef   = useRef(); const trendChart   = useRef();

  // Load zones for map
  useEffect(() => {
    getEcosystemZones().then(setZones).catch(() => {});
  }, []);

  // Load history when toggled
  const loadHistory = () =>
    getEcosystemHistory().then(setHistory).catch(() => {});

  const toggleHistory = () => {
    if (!showHist) loadHistory();
    setShowHist(v => !v);
  };

  // ── Gauge Chart ─────────────────────────────────────────────────────────────
  const renderGauge = (score, category) => {
    gaugeChart.current?.destroy();
    if (!gaugeRef.current) return;
    const color  = CAT_COLOR[category];
    const remaining = 100 - score;
    gaugeChart.current = new Chart(gaugeRef.current, {
      type: "doughnut",
      data: {
        datasets: [{
          data: [score, remaining],
          backgroundColor: [color, "#1e3a5a"],
          borderWidth: 0,
          circumference: 180,
          rotation: 270,
        }],
      },
      options: {
        responsive: true,
        cutout: "75%",
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        animation: { duration: 800 },
      },
    });
  };

  // ── Impact Bar Chart ────────────────────────────────────────────────────────
  const renderImpact = (impacts) => {
    impactChart.current?.destroy();
    if (!impactRef.current) return;
    const labels = Object.keys(impacts).map(k => k.replace("_", " "));
    const vals   = Object.values(impacts);
    impactChart.current = new Chart(impactRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Parameter Score (0–100)",
          data: vals,
          backgroundColor: vals.map(v =>
            v >= 71 ? "#2e7d32" : v >= 41 ? "#f57f17" : "#c62828"),
          borderRadius: 6,
        }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        plugins: {
          legend: { display: false },
          title: { display: true, text: "Parameter Health Scores", color: "#e0e6ed" },
        },
        scales: {
          x: { min: 0, max: 100, ticks: { color: "#90caf9" }, grid: { color: "#1e3a5a" } },
          y: { ticks: { color: "#90caf9" }, grid: { color: "#1e3a5a" } },
        },
        animation: { duration: 600 },
      },
    });
  };

  // ── Trend Chart ─────────────────────────────────────────────────────────────
  const renderTrend = (hist) => {
    trendChart.current?.destroy();
    if (!trendRef.current || !hist.length) return;
    const sorted = [...hist].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const labels = sorted.map(r => {
      const d = new Date(r.createdAt);
      return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
    });
    trendChart.current = new Chart(trendRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Health Score",
          data: sorted.map(r => r.health_score),
          borderColor: "#1e90ff",
          backgroundColor: "rgba(30,144,255,0.15)",
          tension: 0.4, fill: true, pointRadius: 5,
          pointBackgroundColor: sorted.map(r =>
            CAT_COLOR[r.category] ?? "#1e90ff"),
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: { display: true, text: "Health Score Trend Over Time", color: "#e0e6ed" },
        },
        scales: {
          y: { min: 0, max: 100, ticks: { color: "#90caf9" }, grid: { color: "#1e3a5a" } },
          x: { ticks: { color: "#90caf9" }, grid: { color: "#1e3a5a" } },
        },
      },
    });
  };

  // Render charts when result/history changes
  useEffect(() => {
    if (result) {
      renderGauge(result.health_score, result.category);
      renderImpact(result.parameter_impacts);
    }
  }, [result]);

  useEffect(() => {
    if (showHist && history.length) renderTrend(history);
  }, [history, showHist]);

  // ── Assess ──────────────────────────────────────────────────────────────────
  const handleAssess = async () => {
    setLoading(true); setError(""); setResult(null);
    try {
      const lat = parseFloat((15 + (Math.random() - 0.5) * 14).toFixed(4));
      const lng = parseFloat((78 + (Math.random() - 0.5) * 20).toFixed(4));
      const res = await assessEcosystem({ ...values, latitude: lat, longitude: lng });
      setResult(res);
      getEcosystemZones().then(setZones).catch(() => {});
    } catch (e) {
      setError(e.response?.data?.error || "Assessment failed. Is Flask running?");
    } finally {
      setLoading(false);
    }
  };

  // ── CSV Export ──────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ["Date","Score","Category","Temp","Salinity","O2","Chl-a","pH","Nitrate","Fish Index","Biodiversity"];
    const rows = history.map(r => [
      new Date(r.createdAt).toLocaleString(),
      r.health_score, r.category,
      r.parameters?.temperature, r.parameters?.salinity,
      r.parameters?.dissolved_o2, r.parameters?.chlorophyll,
      r.parameters?.ph, r.parameters?.nitrate,
      r.parameters?.fish_index, r.parameters?.biodiversity,
    ]);
    const csv  = [headers, ...rows].map(r => r.join(",")).join("\n");
    const url  = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    const a    = document.createElement("a");
    a.href     = url; a.download = "ecosystem_health.csv"; a.click();
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    setDeleting(id);
    await deleteEcosystemRecord(id).catch(() => {});
    setHistory(h => h.filter(r => r._id !== id));
    setDeleting(null);
  };

  return (
    <div className="eco-page">
      <div className="eco-header">
        <h1>🌊 Marine Ecosystem Health</h1>
        <p>Assess ocean health using multi-parameter analysis for Indian EEZ waters</p>
      </div>

      <div className="eco-main-grid">
        {/* ── LEFT: Input ── */}
        <div className="eco-input-col">
          <div className="eco-card">
            <h3>Ocean Parameters</h3>
            {PARAMS.map(p => (
              <div className="eco-slider-row" key={p.key}>
                <div className="eco-slider-label">
                  <span>{p.label}</span>
                  <span className="eco-slider-val">
                    {values[p.key]}{p.unit}
                  </span>
                </div>
                <input type="range"
                  min={p.min} max={p.max} step={p.step}
                  value={values[p.key]}
                  onChange={e => setValues(v => ({ ...v, [p.key]: Number(e.target.value) }))}
                />
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

        {/* ── RIGHT: Result ── */}
        <div className="eco-result-col">
          {!result && !loading && (
            <div className="eco-placeholder">
              <span>🌊</span>
              <p>Set ocean parameters and click<br />"Assess Ecosystem Health"</p>
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
              {/* Gauge */}
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

              {/* Impact chart */}
              <div className="eco-card">
                <canvas ref={impactRef} />
              </div>

              {/* Recommendations */}
              <div className="eco-card">
                <h3>📋 Recommendations</h3>
                <ul className="rec-list">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className={
                      r.startsWith("🚨") ? "rec-critical" :
                      r.startsWith("⚠️") ? "rec-warning"  : "rec-ok"
                    }>{r}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Map ── */}
      <div className="eco-card eco-map-section">
        <h3>🗺️ Indian Ocean — Zone Health Map</h3>
        <div className="map-legend">
          {Object.entries(CAT_COLOR).map(([k, v]) => (
            <span key={k}><span className="dot" style={{ background: v }} /> {k}</span>
          ))}
        </div>
        <MapContainer center={[15, 78]} zoom={5}
          style={{ height: "400px", borderRadius: "12px" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap' />
          {zones.map((z, i) => (
            <CircleMarker key={i}
              center={[z.latitude, z.longitude]}
              radius={10}
              pathOptions={{
                color: CAT_COLOR[z.category] ?? "#607d8b",
                fillOpacity: 0.8, weight: 0,
              }}
            >
              <Popup>
                <b>{z.zone_name || "Assessment Zone"}</b><br />
                Score: <b>{z.health_score}</b><br />
                <span style={{ color: CAT_COLOR[z.category] }}>{z.category}</span><br />
                {new Date(z.createdAt).toLocaleString()}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* ── History ── */}
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

            {/* Trend chart */}
            {history.length > 1 && (
              <div style={{ marginBottom: "1.5rem" }}>
                <canvas ref={trendRef} />
              </div>
            )}

            {/* Table */}
            {history.length === 0 ? (
              <p style={{ color: "#607d8b", textAlign: "center", padding: "2rem" }}>
                No assessments yet.
              </p>
            ) : (
              <div className="eco-table-scroll">
                <table className="eco-table">
                  <thead>
                    <tr>
                      <th>#</th><th>Date</th><th>Score</th><th>Category</th>
                      <th>Temp</th><th>O₂</th><th>Chl-a</th><th>pH</th>
                      <th>Nitrate</th><th>Method</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((r, i) => (
                      <tr key={r._id}>
                        <td>{i + 1}</td>
                        <td>{new Date(r.createdAt).toLocaleString()}</td>
                        <td><strong>{r.health_score}</strong></td>
                        <td>
                          <span className="badge"
                            style={{ background: CAT_COLOR[r.category] }}>
                            {r.category}
                          </span>
                        </td>
                        <td>{r.parameters?.temperature ?? "—"}</td>
                        <td>{r.parameters?.dissolved_o2 ?? "—"}</td>
                        <td>{r.parameters?.chlorophyll  ?? "—"}</td>
                        <td>{r.parameters?.ph           ?? "—"}</td>
                        <td>{r.parameters?.nitrate      ?? "—"}</td>
                        <td style={{ fontSize: ".75rem", color: "#90caf9" }}>
                          {r.method?.split(" ")[0]}
                        </td>
                        <td>
                          <button className="btn-delete"
                            onClick={() => handleDelete(r._id)}
                            disabled={deleting === r._id}>
                            {deleting === r._id ? "…" : "✕"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}