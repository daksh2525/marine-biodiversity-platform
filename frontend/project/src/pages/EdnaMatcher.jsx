import { useState, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";
import "../styles/EdnaMatcher.css";

const EXPRESS = "http://localhost:5002/api";

const SAMPLE_SEQ = "ATGCTTGTATTTGTACTAATCCTTGCAGTCATAGCTCATACTATGCTTATTCCAACTTGCCTTGCAATAGCACATGCCATGCTAATCCCAACCTGCCTGGCAATAGCACATACCATGCTAATCCCGACC";

const CONSERVATION_COLOR = {
  "Least Concern":   "#16a34a",
  "Near Threatened": "#d97706",
  "Vulnerable":      "#ea580c",
  "Endangered":      "#dc2626",
  "Not evaluated":   "#4a6a82",
};

export default function EdnaMatcher() {
  const [seq,      setSeq]      = useState("");
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [status,   setStatus]   = useState("");
  const [error,    setError]    = useState("");
  const [seqError, setSeqError] = useState("");
  const [history,  setHistory]  = useState([]);
  const [showHist, setShowHist] = useState(false);
  const [filter,   setFilter]   = useState("");
  const [deleting, setDeleting] = useState(null);

  /* ── Validation ── */
  const validateSeq = (s) => {
    const clean = s.toUpperCase().replace(/\s/g, "");
    if (!clean) { setSeqError(""); return; }
    const invalid = [...new Set(clean)].filter(c => !"ATCGN".includes(c));
    if (invalid.length)
      setSeqError(`Invalid characters: ${invalid.join(", ")} — Only A, T, C, G, N allowed`);
    else if (clean.length < 50)
      setSeqError(`Sequence too short (${clean.length} bp — minimum 50 bp)`);
    else setSeqError("");
  };

  const onSeqChange = (e) => {
    setSeq(e.target.value);
    validateSeq(e.target.value);
    setResult(null); setError("");
  };

  /* ── Live stats ── */
  const liveStats = () => {
    const clean = seq.toUpperCase().replace(/\s/g, "");
    if (!clean) return null;
    const g = clean.split("G").length - 1;
    const c = clean.split("C").length - 1;
    const a = clean.split("A").length - 1;
    const t = clean.split("T").length - 1;
    return {
      length: clean.length,
      gc: ((g + c) / clean.length * 100).toFixed(1),
      at: ((a + t) / clean.length * 100).toFixed(1),
    };
  };

  /* ── Match ── */
  const handleMatch = async () => {
    if (!seq.trim()) { setError("Please enter a DNA sequence."); return; }
    if (seqError)    { setError(seqError); return; }
    setLoading(true); setError(""); setResult(null);
    setStatus("🔍 Validating sequence…");
    try {
      setStatus("📡 Submitting to NCBI BLAST (may take 15–30s)…");
      const res = await axios.post(`${EXPRESS}/match-edna`,
        { dna_sequence: seq.trim() }, { timeout: 35000 });
      setResult(res.data); setStatus("");
    } catch (e) {
      setError(e.response?.data?.error || "Matching failed. Is Flask running?");
      setStatus("");
    } finally { setLoading(false); }
  };

  /* ── History ── */
  const loadHistory = () =>
    axios.get(`${EXPRESS}/edna-history`).then(r => setHistory(r.data)).catch(() => {});

  useEffect(() => { if (showHist) loadHistory(); }, [showHist]);
  useEffect(() => { if (result)   loadHistory(); }, [result]);

  const handleDelete = async (id) => {
    setDeleting(id);
    await axios.delete(`${EXPRESS}/edna-history/${id}`).catch(() => {});
    setHistory(h => h.filter(r => r._id !== id));
    setDeleting(null);
  };

  const exportCSV = () => {
    const h = ["Date","Species","Scientific","Match%","E-value","Method","Conservation"];
    const rows = history.map(r => [
      new Date(r.createdAt).toLocaleString(), r.species_name, r.scientific_name,
      r.match_percentage, r.e_value ?? "N/A", r.method_used, r.conservation_status,
    ]);
    const csv = [h, ...rows].map(r => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    a.download = "edna_history.csv"; a.click();
  };

  const stats    = liveStats();
  const filtered = filter
    ? history.filter(r => r.species_name?.toLowerCase().includes(filter.toLowerCase())
                       || r.scientific_name?.toLowerCase().includes(filter.toLowerCase()))
    : history;

  /* ── Match bar color ── */
  const matchColor = (pct) =>
    pct >= 90 ? "#22c55e" : pct >= 70 ? "#f59e0b" : "#ef4444";

  return (
    <div className="edna-page">

      {/* Header */}
      <div className="edna-header">
        <h1>🧬 eDNA Species Matcher</h1>
        <p>Paste a DNA sequence from a water sample — AI matches it against NCBI GenBank and our local Indian marine fish database</p>
      </div>

      <div className="edna-grid">

        {/* ══ LEFT: Input ══ */}
        <div className="edna-input-sticky">
          <div className="edna-card">
            <div className="seq-label-row">
              <h3>DNA Sequence Input</h3>
              <button className="btn-sample"
                onClick={() => { setSeq(SAMPLE_SEQ); validateSeq(SAMPLE_SEQ); setResult(null); }}>
                ⚗️ Load Sample
              </button>
            </div>

            <textarea
              className={`seq-input ${seqError ? "invalid" : seq.length > 49 && !seqError ? "valid" : ""}`}
              value={seq} onChange={onSeqChange}
              placeholder={"Paste DNA sequence here…\nExample: ATGCTTGTATTTGTACTAATCC…"}
              rows={9} spellCheck={false}
            />

            {seqError && <div className="seq-error">⚠️ {seqError}</div>}

            {/* Live stats pills */}
            {stats && !seqError && (
              <div className="seq-stats">
                <span>Length: <b>{stats.length} bp</b></span>
                <span>GC: <b>{stats.gc}%</b></span>
                <span>AT: <b>{stats.at}%</b></span>
                <span className={stats.length >= 100 ? "good" : "warn"}>
                  {stats.length >= 100 ? "✅ Good quality" : "⚠️ Short sequence"}
                </span>
              </div>
            )}

            <button className="btn-match" onClick={handleMatch}
              disabled={loading || !!seqError || !seq.trim()}>
              {loading
                ? <><span className="spinner" /> {status || "Matching…"}</>
                : <>🔬 Match Species</>
              }
            </button>

            {!loading && status && <p className="status-msg">{status}</p>}
            {error && <div className="edna-error">⚠️ {error}</div>}
          </div>
        </div>

        {/* ══ RIGHT: Results ══ */}
        <div>
          {!result && !loading && (
            <div className="edna-placeholder">
              <span>🧬</span>
              <p>Paste a DNA sequence and click<br />"Match Species" to identify</p>
            </div>
          )}

          {loading && (
            <div className="edna-placeholder">
              <div className="big-spin" />
              <p style={{ marginTop: "0.25rem" }}>{status || "Searching database…"}</p>
            </div>
          )}

          {result && !loading && (
            <>
              {/* Main result */}
              <div className="edna-card result-main"
                style={{ borderLeft: `4px solid ${CONSERVATION_COLOR[result.conservation_status] || "#4a6a82"}` }}>
                <div className="res-top">
                  <div>
                    <h2>{result.species_name}</h2>
                    <em className="sci-name">{result.scientific_name}</em>
                  </div>
                  <span className={`method-badge ${result.method_used === "NCBI" ? "ncbi" : "local"}`}>
                    {result.method_used === "NCBI" ? "🌐 NCBI BLAST" : "📁 Local DB"}
                  </span>
                </div>

                {/* Match bar */}
                <div className="match-label">
                  <span>Match Percentage</span>
                  <strong>{result.match_percentage}%</strong>
                </div>
                <div className="match-bg">
                  <div className="match-fill" style={{
                    width: `${result.match_percentage}%`,
                    background: matchColor(result.match_percentage),
                  }} />
                </div>

                {result.e_value != null && (
                  <p className="evalue">
                    E-value: <b>{result.e_value.toExponential(2)}</b>
                    <span className="tooltip" title="Lower = better match. Values < 0.001 indicate significant similarity."> ℹ️</span>
                  </p>
                )}

                <div className="cons-row">
                  <span className="cons-badge"
                    style={{ background: CONSERVATION_COLOR[result.conservation_status] ?? "#4a6a82" }}>
                    {result.conservation_status}
                  </span>
                </div>

                <p className="species-desc">{result.description}</p>
              </div>

              {/* Sequence stats */}
              {result.sequence_stats && (
                <div className="edna-card">
                  <h3>📊 Sequence Statistics</h3>
                  <div className="seq-stat-grid">
                    {[
                      { label: "Length",     value: `${result.sequence_stats.length} bp` },
                      { label: "GC Content", value: `${result.sequence_stats.gc_content}%` },
                      { label: "AT Content", value: `${result.sequence_stats.at_content}%` },
                      { label: "N Content",  value: `${result.sequence_stats.n_content}%` },
                      { label: "Quality",    value: result.sequence_stats.quality,
                        color: result.sequence_stats.quality === "Good"     ? "#22c55e"
                             : result.sequence_stats.quality === "Moderate" ? "#f59e0b" : "#ef4444" },
                    ].map(s => (
                      <div className="sstat" key={s.label}>
                        <span>{s.label}</span>
                        <strong style={s.color ? { color: s.color } : {}}>{s.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Map */}
              {result.found_locations?.length > 0 && (
                <div className="edna-card">
                  <h3>🗺️ Species Distribution — Indian Ocean</h3>
                  <MapContainer center={[12, 78]} zoom={5}
                    style={{ height: "280px", borderRadius: "12px", width: "100%" }}>
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                      attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    />
                    {result.found_locations.map((loc, i) => (
                      <CircleMarker key={i} center={[loc[0], loc[1]]} radius={10}
                        pathOptions={{ color: "#06b6d4", fillColor: "#06b6d4", fillOpacity: 0.7, weight: 2 }}>
                        <Popup>
                          <b>{result.species_name}</b><br />Known habitat location
                        </Popup>
                      </CircleMarker>
                    ))}
                  </MapContainer>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── History ── */}
      <div className="edna-hist-section">
        <button className="btn-toggle" onClick={() => setShowHist(v => !v)}>
          {showHist ? "▲ Hide History" : "▼ Show eDNA Match History"}
        </button>

        {showHist && (
          <div className="edna-card" style={{ marginTop: "0.75rem" }}>
            <div className="hist-head">
              <h3>Match History ({history.length})</h3>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input className="filter-input" placeholder="🔍 Filter species…"
                  value={filter} onChange={e => setFilter(e.target.value)} />
                {history.length > 0 &&
                  <button className="btn-export" onClick={exportCSV}>⬇ CSV</button>}
              </div>
            </div>

            {filtered.length === 0
              ? <p className="empty-msg">No records found.</p>
              : <div className="edna-table-wrap">
                  <table className="edna-table">
                    <thead>
                      <tr>
                        <th>#</th><th>Date</th><th>Species</th><th>Scientific</th>
                        <th>Match%</th><th>Method</th><th>Conservation</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r, i) => (
                        <tr key={r._id}>
                          <td>{i + 1}</td>
                          <td>{new Date(r.createdAt).toLocaleString()}</td>
                          <td><strong style={{ color: "#e8f4f8" }}>{r.species_name}</strong></td>
                          <td><em style={{ color: "#06b6d4", opacity: 0.8 }}>{r.scientific_name}</em></td>
                          <td>
                            <span className="match-chip" style={{ background: matchColor(r.match_percentage) }}>
                              {r.match_percentage}%
                            </span>
                          </td>
                          <td>
                            <span className={`method-badge sm ${r.method_used === "NCBI" ? "ncbi" : "local"}`}>
                              {r.method_used}
                            </span>
                          </td>
                          <td>
                            <span className="cons-badge sm"
                              style={{ background: CONSERVATION_COLOR[r.conservation_status] ?? "#4a6a82" }}>
                              {r.conservation_status}
                            </span>
                          </td>
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