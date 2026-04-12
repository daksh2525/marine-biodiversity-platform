import { useState } from "react";

const MONTH_NAMES = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const BADGE_COLOR = { High: "#2e7d32", Medium: "#f57f17", Low: "#c62828" };

export default function HistoryTable({ records = [], onDelete, deleting }) {
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [filter,  setFilter]  = useState("All");
  const [search,  setSearch]  = useState("");
  const [page,    setPage]    = useState(1);
  const PER_PAGE = 10;

  // ── Sort handler ────────────────────────────────────────────────────────────
  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
    setPage(1);
  };
  const arrow = (key) => sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : " ⇅";

  // ── Filter + Search + Sort pipeline ────────────────────────────────────────
  const valid = records.filter((r) => r?.input != null);

  const afterFilter = filter === "All"
    ? valid
    : valid.filter((r) => r.category === filter);

  const afterSearch = search.trim()
    ? afterFilter.filter((r) =>
        MONTH_NAMES[r.input?.month]?.toLowerCase().includes(search.toLowerCase()) ||
        r.category?.toLowerCase().includes(search.toLowerCase()) ||
        String(r.fish_abundance).includes(search) ||
        String(r.input?.temperature).includes(search)
      )
    : afterFilter;

  const sorted = [...afterSearch].sort((a, b) => {
    let va, vb;
    if (sortKey === "date")       { va = new Date(a.createdAt);    vb = new Date(b.createdAt); }
    else if (sortKey === "abundance") { va = a.fish_abundance;     vb = b.fish_abundance; }
    else if (sortKey === "temp")  { va = a.input?.temperature ?? 0; vb = b.input?.temperature ?? 0; }
    else if (sortKey === "lat") { va = a.latitude ?? 0;  vb = b.latitude ?? 0; }
    else if (sortKey === "lng") { va = a.longitude ?? 0; vb = b.longitude ?? 0; }
    return sortDir === "asc" ? va - vb : vb - va;
  });

  // ── Pagination ──────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const paginated  = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const avg = valid.length
    ? (valid.reduce((s, r) => s + r.fish_abundance, 0) / valid.length).toFixed(2)
    : 0;
  const maxRec = valid.reduce((m, r) => r.fish_abundance > (m?.fish_abundance ?? -1) ? r : m, null);
  const minRec = valid.reduce((m, r) => r.fish_abundance < (m?.fish_abundance ?? Infinity) ? r : m, null);

  // ── CSV Export ──────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const header = ["Date","Lat","Lng","Temp(°C)","Salinity","O2","Chl-a","Month","Depth(m)","Abundance(kg/km2)","RF","XGB","Category"];
    const rows = sorted.map((r) => [
      new Date(r.createdAt).toLocaleString(),
      r.latitude  ?? "",
      r.longitude ?? "",
      r.input?.temperature ?? "",
      r.input?.salinity    ?? "",
      r.input?.oxygen      ?? "",
      r.input?.chlorophyll ?? "",
      MONTH_NAMES[r.input?.month] ?? "",
      r.input?.depth       ?? "",
      r.fish_abundance,
      r.rf_prediction,
      r.xgb_prediction,
      r.category,
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new URL(`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`);
    const a = document.createElement("a");
    a.href = blob.href ?? `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    a.download = "fish_predictions.csv";
    a.click();
  };

  if (!records.length) {
    return <p className="loading-text">No predictions yet — go make one on the Home page!</p>;
  }

  return (
    <div className="history-table-wrapper">

      {/* ── Stats Bar ── */}
      <div className="stats-bar">
        {[
          { label: "Total",    value: valid.length },
          { label: "Avg",      value: `${avg} kg/km²` },
          { label: "Highest",  value: `${maxRec?.fish_abundance ?? "—"} kg/km²`, color: "#2e7d32" },
          { label: "Lowest",   value: `${minRec?.fish_abundance ?? "—"} kg/km²`, color: "#c62828" },
          { label: "High / Med / Low",
            value: `${valid.filter(r=>r.category==="High").length} / ${valid.filter(r=>r.category==="Medium").length} / ${valid.filter(r=>r.category==="Low").length}` },
        ].map(({ label, value, color }) => (
          <div className="stat-card" key={label}>
            <span>{label}</span>
            <strong style={color ? { color } : {}}>{value}</strong>
          </div>
        ))}
      </div>

      {/* ── Controls ── */}
      <div className="table-controls">
        {/* Filter buttons */}
        <div className="filter-bar">
          {["All", "High", "Medium", "Low"].map((cat) => (
            <button
              key={cat}
              className={`filter-btn ${filter === cat ? "active" : ""}`}
              style={filter === cat && cat !== "All" ? { background: BADGE_COLOR[cat], borderColor: BADGE_COLOR[cat] } : {}}
              onClick={() => { setFilter(cat); setPage(1); }}
            >
              {cat}
              {cat !== "All" && (
                <span className="filter-count">
                  {valid.filter((r) => r.category === cat).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search + Export */}
        <div className="table-actions">
          <input
            className="search-input"
            type="text"
            placeholder="Search by temp, month, category…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <button className="btn-export" onClick={exportCSV} title="Export to CSV">
            ⬇ Export CSV
          </button>
        </div>
      </div>

      <p className="showing-text">
        Showing {paginated.length} of {sorted.length} records
        {filter !== "All" || search ? ` (filtered from ${valid.length})` : ""}
      </p>

      {/* ── Table ── */}
      <div className="table-scroll">
        <table className="history-table">
          <thead>
            <tr>
              <th>#</th>
              <th className="sortable" onClick={() => handleSort("date")}>Date{arrow("date")}</th>
              <th className="sortable" onClick={() => handleSort("temp")}>Temp (°C){arrow("temp")}</th>
              <th className="sortable" onClick={() => handleSort("lat")}>Lat{arrow("lat")}</th>
              <th className="sortable" onClick={() => handleSort("lng")}>Lng{arrow("lng")}</th>
              <th>Salinity</th>
              <th>O₂</th>
              <th>Chl-a</th>
              <th>Month</th>
              <th className="sortable" onClick={() => handleSort("depth")}>Depth (m){arrow("depth")}</th>
              <th className="sortable" onClick={() => handleSort("abundance")}>
                Abundance (kg/km²){arrow("abundance")}
              </th>
              <th>RF Pred</th>
              <th>XGB Pred</th>
              <th>Category</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={13} style={{ textAlign: "center", color: "#607d8b", padding: "2rem" }}>
                  No records match your filter / search.
                </td>
              </tr>
            ) : (
              paginated.map((r, i) => (
                <tr key={r._id}>
                  <td>{(page - 1) * PER_PAGE + i + 1}</td>
                  <td>{new Date(r.createdAt).toLocaleString()}</td>
                                      <td>{r.input?.temperature ?? "—"}</td>
                    <td>{r.latitude  != null ? r.latitude.toFixed(4)  : "—"}</td>
                    <td>{r.longitude != null ? r.longitude.toFixed(4) : "—"}</td>
                  <td>{r.input?.salinity    ?? "—"}</td>
                  <td>{r.input?.oxygen      ?? "—"}</td>
                  <td>{r.input?.chlorophyll ?? "—"}</td>
                  <td>{MONTH_NAMES[r.input?.month] ?? "—"}</td>
                  <td>{r.input?.depth       ?? "—"}</td>
                  <td><strong>{r.fish_abundance}</strong></td>
                  <td>{r.rf_prediction  ?? "—"}</td>
                  <td>{r.xgb_prediction ?? "—"}</td>
                  <td>
                    <span className="badge" style={{ background: BADGE_COLOR[r.category] ?? "#607d8b" }}>
                      {r.category ?? "Unknown"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-delete"
                      onClick={() => onDelete?.(r._id)}
                      disabled={deleting === r._id}
                      title="Delete this record"
                    >
                      {deleting === r._id ? "…" : "✕"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="pagination">
          <button onClick={() => setPage(1)}        disabled={page === 1}>«</button>
          <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}>‹</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce((acc, p, idx, arr) => {
              if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…");
              acc.push(p);
              return acc;
            }, [])
            .map((p, idx) =>
              p === "…"
                ? <span key={`ellipsis-${idx}`} className="page-ellipsis">…</span>
                : <button key={p} className={page === p ? "active" : ""} onClick={() => setPage(p)}>{p}</button>
            )
          }
          <button onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>›</button>
          <button onClick={() => setPage(totalPages)}   disabled={page === totalPages}>»</button>
        </div>
      )}
    </div>
  );
}