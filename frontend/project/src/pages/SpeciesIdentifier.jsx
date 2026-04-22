import { useState, useRef, useCallback, useEffect } from "react";
import { identifySpecies, getSpeciesHistory, deleteSpeciesRecord } from "../services/api";
import speciesDatabase, { getSpeciesData, getConservationColor, getFishImage } from "../data/speciesDatabase";
import "../styles/SpeciesIdentifier.css";
async function validateImage(file) {
  // 1. Extension check
  const ext = file.name.split(".").pop().toLowerCase();
  if (!["jpg","jpeg","png"].includes(ext))
    return { valid: false, error: "Only JPG and PNG images are allowed." };

  // 2. Size check (10 MB)
  if (file.size > 10 * 1024 * 1024)
    return { valid: false, error: "File too large. Maximum size is 10 MB." };

  // 3. Dimension check — screenshots are typically very wide
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      if (img.width > 4000 || img.height > 4000)
        return resolve({ valid: false,
          error: "Image resolution too high. Please use a photo under 4000×4000 px." });
      resolve({ valid: true });
    };
    img.onerror = () => resolve({ valid: false, error: "Could not read image file." });
    img.src = URL.createObjectURL(file);
  });
}

const CONSERVATION_COLORS = {
  "Least Concern":   "#2e7d32",
  "Near Threatened": "#f57f17",
  "Vulnerable":      "#e65100",
  "Endangered":      "#c62828",
  "Not evaluated":   "#607d8b",
};

function ConservationBadge({ status }) {
  const color = getConservationColor(status) || "#607d8b";
  return (
    <span style={{
      display: "inline-block", padding: ".2rem .7rem", borderRadius: "20px",
      background: color, color: "#fff", fontSize: ".75rem", fontWeight: 700,
    }}>
      {status || "Not evaluated"}
    </span>
  );
}

// ── Error card with tip ───────────────────────────────────────────────────────
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

// ── Fish photo component ──────────────────────────────────────────────────────
function FishPhoto({ label, name }) {
  const [src,    setSrc]    = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [error,  setError]  = useState(false);

  useEffect(() => {
    const url = getFishImage(label);
    setSrc(url);
    setLoaded(false);
    setError(false);
  }, [label]);

  if (!src || error) return null;

  return (
    <div className="fish-photo-wrapper">
      {!loaded && <div className="fish-photo-skeleton" />}
      <img
        src={src}
        alt={`Photo of ${name}`}
        className={`fish-photo ${loaded ? "loaded" : ""}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
      <span className="fish-photo-caption">📷 {name} — Wikipedia Commons</span>
    </div>
  );
}

export default function SpeciesIdentifier() {
  const [file,       setFile]       = useState(null);
  const [preview,    setPreview]    = useState(null);
  const [result,     setResult]     = useState(null);
  const [dbInfo,     setDbInfo]     = useState(null);   // ← species DB lookup
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [errorTip,   setErrorTip]   = useState("");
  const [dragOver,   setDragOver]   = useState(false);
  const [history,    setHistory]    = useState([]);
  const [histLoading,setHistLoading]= useState(false);
  const [showHistory,setShowHistory]= useState(false);
  const [deleting,   setDeleting]   = useState(null);
  const inputRef = useRef();

  // ── Load history ─────────────────────────────────────────────────────────
  const loadHistory = () => {
    setHistLoading(true);
    getSpeciesHistory()
      .then(d => { setHistory(d); setHistLoading(false); })
      .catch(() => setHistLoading(false));
  };

  const toggleHistory = () => {
    if (!showHistory) loadHistory();
    setShowHistory(v => !v);
  };

  // ── File handling ─────────────────────────────────────────────────────────
  const handleFile = useCallback(async (f) => {
    if (!f) return;
    setError(""); setErrorTip(""); setResult(null); setDbInfo(null);

    const check = await validateImage(f);
    if (!check.valid) {
      setError(check.error);
      setErrorTip("Please upload a clear fish photo in JPG or PNG format.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const onInputChange = e => handleFile(e.target.files[0]);
  const onDrop = useCallback(e => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const clearImage = () => {
    setFile(null); setPreview(null);
    setResult(null); setDbInfo(null);
    setError(""); setErrorTip("");
    if (inputRef.current) inputRef.current.value = "";
  };

  // ── Identify ──────────────────────────────────────────────────────────────
  const handleIdentify = async () => {
    if (!file) { setError("Please upload a fish image first."); return; }
    setLoading(true); setError(""); setErrorTip(""); setResult(null); setDbInfo(null);
    try {
      const res = await identifySpecies(file);
      setResult(res);

      // ── DB lookup ─────────────────────────────────────────────────────
      const info = getSpeciesData(res.common_name)
                || getSpeciesData(res.species_key)
                || getSpeciesData(res.scientific_name);
      setDbInfo(info);

      if (showHistory) loadHistory();
    } catch (e) {
      const apiErr = e.response?.data;
      setError(apiErr?.error || "Identification failed. Is Flask running?");
      setErrorTip(apiErr?.tip || "Upload a clear, well-lit fish photo with plain background.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    await deleteSpeciesRecord(id).catch(() => {});
    setHistory(h => h.filter(r => r._id !== id));
    setDeleting(null);
  };

  // Merge API result with DB info — DB info takes priority for missing fields
  const displayInfo = {
    common_name:     result?.common_name     || "Unknown",
    scientific_name: dbInfo?.scientificName  || result?.scientific_name || "Unknown",
    habitat:         dbInfo?.habitat         || result?.habitat          || "Unknown",
    conservation:    dbInfo?.conservationStatus || result?.conservation  || "Not evaluated",
    description:     dbInfo?.description     || result?.description      || "No description available.",
    depth:           dbInfo?.depth           || null,
    avgLength:       dbInfo?.avgLength        || null,
    indiaRegion:     dbInfo?.indiaRegion      || null,
  };

  return (
    <div className="species-page">
      <div className="species-header">
        <h1>🐠 Fish Species Identifier</h1>
        <p>Upload a fish photo — AI identifies the species using deep learning</p>
      </div>

      <div className="species-grid">
        {/* ── Upload ── */}
        <div className="species-upload-col">
          <div
            className={`drop-zone ${dragOver ? "drag-over" : ""} ${preview ? "has-preview" : ""}`}
            style={error && !preview ? { borderColor: "#c62828" } : {}}
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => !preview && inputRef.current?.click()}
          >
            {preview ? (
              <div className="preview-wrapper">
                <img src={preview} alt="Fish preview" className="fish-preview" />
                <button className="btn-clear" onClick={e => { e.stopPropagation(); clearImage(); }}>
                  ✕ Remove
                </button>
              </div>
            ) : (
              <div className="drop-hint">
                <span className="drop-icon">📷</span>
                <p>Drag & drop a fish image here</p>
                <p className="drop-sub">or click to browse</p>
                <p className="drop-formats">JPG, PNG — max 10 MB</p>
              </div>
            )}
          </div>

          <input ref={inputRef} type="file" accept="image/jpeg,image/png"
            onChange={onInputChange} style={{ display: "none" }} />

          {!preview && (
            <button className="btn-browse" onClick={() => inputRef.current?.click()}>
              📁 Browse Image
            </button>
          )}

          <button className="btn-identify" onClick={handleIdentify}
            disabled={!file || loading}>
            {loading
              ? <><span className="spinner" /> Identifying…</>
              : "🔬 Identify Species"}
          </button>

          {/* Validation / API error */}
          {error && (
            <ValidationError
              error={error}
              tip={errorTip}
              onRetry={clearImage}
            />
          )}
        </div>

        {/* ── Result ── */}
        <div className="species-result-col">
          {!result && !loading && !error && (
            <div className="result-placeholder">
              <span>🐟</span>
              <p>Upload a fish image and click<br />"Identify Species" to see results</p>
            </div>
          )}

          {loading && (
            <div className="result-placeholder">
              <div className="big-spinner" />
              <p>Analysing image…</p>
            </div>
          )}

          {result && !loading && (
            <div className="result-card-species"
              style={{ borderLeft: `4px solid ${getConservationColor(displayInfo.conservation)}` }}>

              {/* ── Fish photo ── */}
              <FishPhoto
                label={result.species_key || result.common_name}
                name={displayInfo.common_name}
              />

              {/* Names */}
              <div className="result-top">
                <div className="result-names">
                  <h2>{displayInfo.common_name}</h2>
                  <p className="scientific-name"><em>{displayInfo.scientific_name}</em></p>
                </div>
                <ConservationBadge status={displayInfo.conservation} />
              </div>

              {/* Confidence */}
              <div className="confidence-section">
                <div className="confidence-label">
                  <span>AI Confidence</span>
                  <strong>{result.confidence?.toFixed(1)}%</strong>
                </div>
                <div className="confidence-bar-bg">
                  <div className="confidence-bar-fill" style={{
                    width: `${result.confidence}%`,
                    background: result.confidence >= 80 ? "#2e7d32"
                              : result.confidence >= 50 ? "#f57f17" : "#c62828",
                  }} />
                </div>
              </div>

              {/* Info grid */}
              <div className="info-grid">
                <div className="info-item">
                  <span>🌊 Habitat</span>
                  <strong>{displayInfo.habitat}</strong>
                </div>
                <div className="info-item">
                  <span>🛡️ Conservation</span>
                  <strong style={{ color: getConservationColor(displayInfo.conservation) }}>
                    {displayInfo.conservation}
                  </strong>
                </div>
                {displayInfo.depth && (
                  <div className="info-item">
                    <span>📏 Depth Range</span>
                    <strong>{displayInfo.depth}</strong>
                  </div>
                )}
                {displayInfo.avgLength && (
                  <div className="info-item">
                    <span>📐 Avg Length</span>
                    <strong>{displayInfo.avgLength}</strong>
                  </div>
                )}
              </div>

              {/* India region */}
              {displayInfo.indiaRegion && (
                <div className="india-region">
                  <span>🇮🇳 Found in India:</span>
                  <strong>{displayInfo.indiaRegion}</strong>
                </div>
              )}

              {/* Description */}
              <p className="species-description">{displayInfo.description}</p>

              {/* Top 3 */}
              {result.top3?.length > 0 && (
                <div className="top3-section">
                  <h4>Top Predictions</h4>
                  {result.top3.map(t => (
                    <div className="top3-row" key={t.rank}>
                      <span className="top3-rank">#{t.rank}</span>
                      <span className="top3-name">{t.common_name}</span>
                      <div className="top3-bar-bg">
                        <div className="top3-bar-fill"
                          style={{ width: `${t.confidence}%`, opacity: 1 - (t.rank - 1) * 0.25 }} />
                      </div>
                      <span className="top3-pct">{t.confidence?.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── History ── */}
      <div className="species-history-section">
        <button className="btn-toggle-history" onClick={toggleHistory}>
          {showHistory ? "▲ Hide History" : "▼ Show Identification History"}
        </button>

        {showHistory && (
          <div className="species-history">
            {histLoading ? (
              <p className="loading-text">Loading history…</p>
            ) : history.length === 0 ? (
              <p className="loading-text">No identifications yet.</p>
            ) : (
              <div className="history-cards">
                {history.map(r => {
                  const hInfo = getSpeciesData(r.common_name) || getSpeciesData(r.species_key);
                  const cons  = hInfo?.conservationStatus || r.conservation || "Not evaluated";
                  return (
                    <div className="history-card" key={r._id}>
                      <div className="hc-top">
                        <div>
                          <strong>{r.common_name}</strong>
                          <em>{hInfo?.scientificName || r.scientific_name}</em>
                        </div>
                        <button className="btn-delete"
                          onClick={() => handleDelete(r._id)}
                          disabled={deleting === r._id}>
                          {deleting === r._id ? "…" : "✕"}
                        </button>
                      </div>
                      <div className="hc-meta">
                        <ConservationBadge status={cons} />
                        <span className="hc-conf">{r.confidence?.toFixed(1)}% confidence</span>
                      </div>
                      {hInfo?.indiaRegion && (
                        <p style={{ fontSize: ".75rem", color: "#607d8b", marginTop: ".3rem" }}>
                          🇮🇳 {hInfo.indiaRegion}
                        </p>
                      )}
                      <div className="confidence-bar-bg" style={{ marginTop: ".4rem" }}>
                        <div className="confidence-bar-fill" style={{
                          width: `${r.confidence}%`,
                          background: r.confidence >= 80 ? "#2e7d32"
                                    : r.confidence >= 50 ? "#f57f17" : "#c62828",
                        }} />
                      </div>
                      <p className="hc-date">{new Date(r.createdAt).toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}