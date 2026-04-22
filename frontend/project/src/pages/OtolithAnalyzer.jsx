import { useState, useEffect, useRef, useCallback } from "react";
import { Chart, registerables } from "chart.js";
import axios from "axios";
import "../styles/OtolithAnalyzer.css";

Chart.register(...registerables);

const EXPRESS = "http://localhost:5002/api";

const STOCK_INFO = {
  stock_A: { label: "Stock A", desc: "Young fast-growing population", color: "#2e7d32" },
  stock_B: { label: "Stock B", desc: "Normal mature population",      color: "#1e90ff" },
  stock_C: { label: "Stock C", desc: "Old/slow-growing population",   color: "#f57f17" },
  A:       { label: "Stock A", desc: "Young fast-growing population", color: "#2e7d32" },
  B:       { label: "Stock B", desc: "Normal mature population",      color: "#1e90ff" },
  C:       { label: "Stock C", desc: "Old/slow-growing population",   color: "#f57f17" },
};
const GROWTH_COLOR = { Fast: "#2e7d32", Normal: "#1e90ff", Slow: "#f57f17", Unknown: "#607d8b" };

// ── Frontend image validation ─────────────────────────────────────────────────
async function validateOtolithImage(file) {
  // 1. Extension — JPG/PNG only
  const ext = file.name.split(".").pop().toLowerCase();
  if (!["jpg", "jpeg", "png"].includes(ext))
    return {
      valid: false,
      error: "Only JPG and PNG images are supported.",
      tip:   "Convert your microscope image to JPG or PNG format.",
    };

  // 2. Size — 10 MB max
  if (file.size > 10 * 1024 * 1024)
    return {
      valid: false,
      error: "File too large. Maximum size is 10 MB.",
      tip:   "Resize or compress the image before uploading.",
    };

  // 3. Dimension checks
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const { width: w, height: h } = img;
      const ratio = w / h;

      // Screenshots are usually very wide (16:9) or very large
      if (ratio > 2.5 || ratio < 0.4)
        return resolve({
          valid: false,
          error: "This looks like a screenshot — wrong aspect ratio for an otolith.",
          tip:   "Otolith microscope images are roughly square. "
               + "Screenshots and documents are rejected.",
        });

      // Typical screen resolutions — strong indicator of screenshot
      const screenRes = [
        [1920,1080],[1366,768],[1280,720],[1440,900],
        [2560,1440],[3840,2160],[1280,800],[1024,768],
      ];
      const isScreen = screenRes.some(([sw, sh]) =>
        Math.abs(w - sw) < 10 && Math.abs(h - sh) < 10
      );
      if (isScreen)
        return resolve({
          valid: false,
          error: "This appears to be a screenshot.",
          tip:   "Upload a microscope photograph of the otolith, not a screenshot.",
        });

      if (w > 4000 || h > 4000)
        return resolve({
          valid: false,
          error: "Image resolution too high (max 4000×4000 px).",
          tip:   "Resize the image before uploading.",
        });

      resolve({ valid: true });
    };
    img.onerror = () => resolve({ valid: false, error: "Could not read image file.", tip: "" });
    img.src = URL.createObjectURL(file);
  });
}

// ── Validation error component ────────────────────────────────────────────────
function ValidationError({ error, tip, onRetry }) {
  return (
    <div className="val-error-box">
      <div className="val-error-title">⚠️ {error}</div>
      {tip && <p className="val-error-tip">💡 {tip}</p>}
      <button className="val-retry-btn" onClick={onRetry}>
        📁 Upload Different Image
      </button>
    </div>
  );
}

export default function OtolithAnalyzer() {
  const [file,     setFile]     = useState(null);
  const [preview,  setPreview]  = useState(null);
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [errorTip, setErrorTip] = useState("");   // ← new
  const [dragOver, setDragOver] = useState(false);
  const [history,  setHistory]  = useState([]);
  const [showHist, setShowHist] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const inputRef    = useRef();
  const ageChartRef = useRef(); const ageChart  = useRef();
  const growChartRef= useRef(); const growChart = useRef();

  // ── File handling (now async + validated) ─────────────────────────────────
  const handleFile = useCallback(async (f) => {
    if (!f) return;
    setError(""); setErrorTip(""); setResult(null);

    const check = await validateOtolithImage(f);
    if (!check.valid) {
      setError(check.error);
      setErrorTip(check.tip || "");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const clearImage = () => {
    setFile(null); setPreview(null); setResult(null);
    setError(""); setErrorTip("");
    if (inputRef.current) inputRef.current.value = "";
  };

  // ── Analyze ────────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!file) { setError("Please upload an otolith image first."); return; }
    setLoading(true); setError(""); setErrorTip(""); setResult(null);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await axios.post(`${EXPRESS}/analyze-otolith`, form,
        { headers: { "Content-Type": "multipart/form-data" } });
      setResult(res.data);
    } catch (e) {
      const apiErr = e.response?.data;
      setError(apiErr?.error || apiErr?.message || "Analysis failed. Is Flask running?");
      setErrorTip(apiErr?.tip || "Upload a grayscale microscope photograph of a fish otolith.");
    } finally {
      setLoading(false);
    }
  };

  // ── Charts ─────────────────────────────────────────────────────────────────
  const renderCharts = (hist) => {
    ageChart.current?.destroy();
    if (ageChartRef.current && hist.length) {
      const ageBuckets = {};
      hist.forEach(r => { ageBuckets[r.age_years] = (ageBuckets[r.age_years] || 0) + 1; });
      const labels = Object.keys(ageBuckets).sort((a, b) => a - b);
      ageChart.current = new Chart(ageChartRef.current, {
        type: "bar",
        data: {
          labels: labels.map(l => `${l} yr`),
          datasets: [{ label: "Count", data: labels.map(l => ageBuckets[l]),
            backgroundColor: "#1e90ff", borderRadius: 6 }],
        },
        options: {
          responsive: true, animation: false,
          plugins: { title: { display: true, text: "Age Distribution", color: "#e0e6ed" },
                     legend: { display: false } },
          scales: { y: { ticks: { color: "#90caf9" }, grid: { color: "#1e3a5a" } },
                    x: { ticks: { color: "#90caf9" }, grid: { color: "#1e3a5a" } } },
        },
      });
    }

    growChart.current?.destroy();
    if (growChartRef.current && hist.length) {
      const sorted = [...hist].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      growChart.current = new Chart(growChartRef.current, {
        type: "line",
        data: {
          labels: sorted.map((_, i) => `#${i + 1}`),
          datasets: [
            { label: "Age (years)", data: sorted.map(r => r.age_years),
              borderColor: "#1e90ff", tension: 0.4, fill: false, pointRadius: 5 },
            { label: "Ring Count",  data: sorted.map(r => r.ring_count),
              borderColor: "#f57f17", tension: 0.4, fill: false, pointRadius: 5 },
          ],
        },
        options: {
          responsive: true, animation: false,
          plugins: { title: { display: true, text: "Age & Ring Count Trends", color: "#e0e6ed" } },
          scales: { y: { ticks: { color: "#90caf9" }, grid: { color: "#1e3a5a" } },
                    x: { ticks: { color: "#90caf9" }, grid: { color: "#1e3a5a" } } },
        },
      });
    }
  };

  const loadHistory = () =>
    axios.get(`${EXPRESS}/otolith-history`)
      .then(r => { setHistory(r.data); renderCharts(r.data); })
      .catch(() => {});

  useEffect(() => { if (showHist) loadHistory(); }, [showHist]);
  useEffect(() => { if (result)   loadHistory(); }, [result]);

  const handleDelete = async (id) => {
    setDeleting(id);
    await axios.delete(`${EXPRESS}/otolith-history/${id}`).catch(() => {});
    setHistory(h => h.filter(r => r._id !== id));
    setDeleting(null);
  };

  const exportCSV = () => {
    const h    = ["Date","Age(yrs)","Rings","Growth Rate","Stock","Confidence"];
    const rows = history.map(r => [
      new Date(r.createdAt).toLocaleString(),
      r.age_years, r.ring_count, r.growth_rate, r.stock_id, r.confidence,
    ]);
    const csv = [h, ...rows].map(r => r.join(",")).join("\n");
    const a   = document.createElement("a");
    a.href    = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    a.download = "otolith_history.csv"; a.click();
  };

  return (
    <div className="oto-page">
      <div className="oto-header">
        <h1>🦴 Otolith Image Analysis</h1>
        <p>Upload a fish ear bone (otolith) image — AI detects growth rings and estimates age, growth rate, and population stock</p>
      </div>

      <div className="oto-grid">
        {/* ── Upload ── */}
        <div className="oto-card">
          <h3>Upload Otolith Image</h3>
          <div
            className={`oto-drop ${dragOver ? "drag-over" : ""} ${preview ? "has-preview" : ""}`}
            style={error && !preview ? { borderColor: "#c62828" } : {}}
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => !preview && inputRef.current?.click()}
          >
            {preview
              ? <div className="oto-preview-wrap">
                  <img src={preview} alt="Otolith" className="oto-preview-img" />
                  <button className="btn-remove"
                    onClick={e => { e.stopPropagation(); clearImage(); }}>
                    ✕ Remove
                  </button>
                </div>
              : <div className="oto-drop-hint">
                  <span>🦴</span>
                  <p>Drag & drop otolith image here</p>
                  <p className="sub">or click to browse</p>
                  <p className="fmt">JPG, PNG — max 10 MB</p>
                </div>
            }
          </div>

          <input ref={inputRef} type="file"
            accept="image/jpeg,image/png"
            onChange={e => handleFile(e.target.files[0])}
            style={{ display: "none" }} />

          {!preview &&
            <button className="btn-browse" onClick={() => inputRef.current?.click()}>
              📁 Browse Image
            </button>
          }

          <button className="btn-analyze" onClick={handleAnalyze} disabled={!file || loading}>
            {loading ? <><span className="spinner" /> Analysing rings…</> : "🔬 Analyze Otolith"}
          </button>

          {/* ── Validation / API error ── */}
          {error && (
            <ValidationError
              error={error}
              tip={errorTip}
              onRetry={clearImage}
            />
          )}
        </div>

        {/* ── Result ── */}
        <div>
          {!result && !loading && !error && (
            <div className="oto-placeholder">
              <span>🦴</span>
              <p>Upload an otolith image to see age and growth analysis</p>
            </div>
          )}
          {loading && (
            <div className="oto-placeholder">
              <div className="big-spinner" />
              <p>Detecting growth rings…</p>
            </div>
          )}

          {result && (
            <>
              {/* Image comparison */}
              <div className="oto-card">
                <h3>Ring Detection Result</h3>
                <div className="img-compare">
                  <div>
                    <p className="img-label">Original</p>
                    <img src={`data:image/png;base64,${result.original_image}`} alt="original" />
                  </div>
                  <div>
                    <p className="img-label">Annotated ({result.ring_count} rings detected)</p>
                    <img src={`data:image/png;base64,${result.annotated_image}`} alt="annotated" />
                  </div>
                </div>
              </div>

              {/* Stats cards */}
              <div className="oto-card">
                <h3>Analysis Results</h3>
                <div className="result-stats">
                  {[
                    { icon: "🎂", label: "Estimated Age",  value: `${result.age_years} years` },
                    { icon: "💫", label: "Growth Rings",   value: result.ring_count },
                    { icon: "📈", label: "Growth Rate",
                      value: result.growth_rate,
                      color: GROWTH_COLOR[result.growth_rate] },
                    { icon: "🐟", label: "Stock Group",
                      value: STOCK_INFO[result.stock_id]?.label ?? result.stock_id,
                      color: STOCK_INFO[result.stock_id]?.color },
                  ].map(s => (
                    <div className="stat-box" key={s.label}>
                      <span className="stat-icon">{s.icon}</span>
                      <span className="stat-label">{s.label}</span>
                      <strong style={s.color ? { color: s.color } : {}}>{s.value}</strong>
                    </div>
                  ))}
                </div>

                <div className="conf-row">
                  <span>AI Confidence</span>
                  <strong>{result.confidence?.toFixed(1)}%</strong>
                </div>
                <div className="conf-bg">
                  <div className="conf-fill" style={{
                    width: `${result.confidence}%`,
                    background: result.confidence >= 70 ? "#2e7d32" : "#f57f17",
                  }} />
                </div>

                {result.growth_desc && <p className="growth-desc">{result.growth_desc}</p>}
                {STOCK_INFO[result.stock_id] && (
                  <p className="stock-desc">{STOCK_INFO[result.stock_id].desc}</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Charts */}
      {history.length > 0 && (
        <div className="oto-charts-grid">
          <div className="oto-card"><canvas ref={ageChartRef} /></div>
          <div className="oto-card"><canvas ref={growChartRef} /></div>
        </div>
      )}

      {/* History */}
      <div className="oto-hist-section">
        <button className="btn-toggle" onClick={() => setShowHist(v => !v)}>
          {showHist ? "▲ Hide History" : "▼ Show Analysis History"}
        </button>
        {showHist && (
          <div className="oto-card" style={{ marginTop: "1rem" }}>
            <div className="hist-head">
              <h3>Analysis History ({history.length})</h3>
              {history.length > 0 &&
                <button className="btn-export" onClick={exportCSV}>⬇ Export CSV</button>}
            </div>
            {history.length === 0
              ? <p className="empty-msg">No analyses yet.</p>
              : <div className="oto-table-wrap">
                  <table className="oto-table">
                    <thead>
                      <tr>
                        <th>#</th><th>Date</th><th>Age</th><th>Rings</th>
                        <th>Growth</th><th>Stock</th><th>Confidence</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((r, i) => (
                        <tr key={r._id}>
                          <td>{i + 1}</td>
                          <td>{new Date(r.createdAt).toLocaleString()}</td>
                          <td><strong>{r.age_years} yr</strong></td>
                          <td>{r.ring_count}</td>
                          <td>
                            <span className="badge"
                              style={{ background: GROWTH_COLOR[r.growth_rate] }}>
                              {r.growth_rate}
                            </span>
                          </td>
                          <td>{STOCK_INFO[r.stock_id]?.label ?? r.stock_id}</td>
                          <td>{r.confidence?.toFixed(1)}%</td>
                          <td>
                            <button className="btn-del"
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
            }
          </div>
        )}
      </div>
    </div>
  );
}