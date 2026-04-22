import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { SkeletonCard, EmptyState, AnimatedNumber } from "../components/UI";

const API = "http://localhost:5002/api";

const MONTH_NAMES = ["","Jan","Feb","Mar","Apr","May","Jun",
                     "Jul","Aug","Sep","Oct","Nov","Dec"];

const CAT_COLOR = {
  High:     "#2e7d32", Medium:   "#f57f17", Low:      "#c62828",
  Healthy:  "#2e7d32", Moderate: "#f57f17", Critical: "#c62828",
  Fast:     "#2e7d32", Normal:   "#1e90ff", Slow:     "#f57f17",
};

// ── Small badge ───────────────────────────────────────────────────────────────
function Badge({ label, color }) {
  return (
    <span style={{
      display: "inline-block", padding: ".18rem .55rem",
      borderRadius: 10, background: color || "#607d8b",
      color: "#fff", fontSize: ".72rem", fontWeight: 700,
      whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

// ── Delete button ─────────────────────────────────────────────────────────────
function DelBtn({ onClick, loading }) {
  return (
    <button onClick={onClick} disabled={loading}
      style={{ background: "#c62828", border: "none", color: "#fff",
        borderRadius: 6, padding: ".22rem .5rem", cursor: "pointer",
        fontSize: ".8rem", opacity: loading ? .5 : 1 }}>
      {loading ? "…" : "✕"}
    </button>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color }) {
  return (
    <div style={{ background: "#1a2d44", borderRadius: 10, padding: ".7rem 1rem",
      border: "1px solid #1e3a5a", display: "flex", flexDirection: "column", gap: .2 }}>
      <span style={{ fontSize: ".72rem", color: "#90caf9" }}>{label}</span>
      <strong style={{ fontSize: "1.05rem", color: color || "#fff" }}>{value}</strong>
    </div>
  );
}

// ── Scrollable table wrapper ──────────────────────────────────────────────────
function TableWrap({ children }) {
  return (
    <div style={{ overflowX: "auto", borderRadius: 10, background: "#1a2d44" }}>
      {children}
    </div>
  );
}

const TH = ({ children, style }) => (
  <th style={{ background: "#0d3358", color: "#90caf9", padding: ".6rem .8rem",
    textAlign: "left", whiteSpace: "nowrap", fontSize: ".8rem", ...style }}>
    {children}
  </th>
);
const TD = ({ children, style }) => (
  <td style={{ padding: ".55rem .8rem", borderBottom: "1px solid #1e3a5a",
    whiteSpace: "nowrap", fontSize: ".82rem", ...style }}>
    {children}
  </td>
);

// ══════════════════════════════════════════════════════════════════════════════
// TAB PANELS
// ══════════════════════════════════════════════════════════════════════════════

// ── Feature 1: Fish Abundance ─────────────────────────────────────────────────
function AbundanceHistory() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [del,     setDel]     = useState(null);
  const [page,    setPage]    = useState(1);
  const PER = 10;

  useEffect(() => {
    axios.get(`${API}/history`)
      .then(r => setData(r.data))
      .catch(() => toast.error("Failed to load abundance history"))
      .finally(() => setLoading(false));
  }, []);

  const handleDel = async (id) => {
    setDel(id);
    try {
      await axios.delete(`${API}/history/${id}`);
      setData(d => d.filter(r => r._id !== id));
      toast.success("Record deleted.");
    } catch { toast.error("Delete failed."); }
    finally { setDel(null); }
  };

  const exportCSV = () => {
    const h = ["Date","Temp","Salinity","O2","Chl-a","Month","Depth","Abundance","RF","XGB","Category"];
    const rows = data.map(r => [
      new Date(r.createdAt).toLocaleString(),
      r.input?.temperature, r.input?.salinity, r.input?.oxygen,
      r.input?.chlorophyll, MONTH_NAMES[r.input?.month], r.input?.depth,
      r.fish_abundance, r.rf_prediction, r.xgb_prediction, r.category,
    ]);
    dl([h,...rows].map(r=>r.join(",")).join("\n"), "abundance_history.csv");
    toast.success("CSV exported!");
  };

  const valid = data.filter(r => r?.input != null);
  const paged = valid.slice((page-1)*PER, page*PER);
  const pages = Math.max(1, Math.ceil(valid.length / PER));

  const avg = valid.length
    ? (valid.reduce((s,r)=>s+r.fish_abundance,0)/valid.length).toFixed(2) : 0;
  const best = valid.reduce((m,r)=>r.fish_abundance>(m?.fish_abundance??-1)?r:m, null);

  if (loading) return [1,2,3].map(i=><SkeletonCard key={i}/>);
  if (!valid.length) return <EmptyState icon="🐟" message="No fish predictions yet" />;

  return (
    <>
      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",
        gap:".7rem", marginBottom:"1.2rem" }}>
        <StatCard label="Total"   value={valid.length} />
        <StatCard label="Average" value={`${avg} kg/km²`} />
        <StatCard label="Highest" value={`${best?.fish_abundance} kg/km²`} color="#2e7d32" />
        <StatCard label="High zones"
          value={valid.filter(r=>r.category==="High").length} color="#2e7d32" />
      </div>

      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:".7rem" }}>
        <button onClick={exportCSV} style={exportBtn}>⬇ Export CSV</button>
      </div>

      <TableWrap>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:780 }}>
          <thead><tr>
            <TH>#</TH><TH>Date</TH><TH>Temp</TH><TH>Salinity</TH>
            <TH>O₂</TH><TH>Chl-a</TH><TH>Month</TH><TH>Depth</TH>
            <TH>Abundance</TH><TH>RF</TH><TH>XGB</TH><TH>Category</TH><TH></TH>
          </tr></thead>
          <tbody>
            {paged.map((r,i)=>(
              <tr key={r._id} style={{ background: i%2?"#162940":"transparent" }}>
                <TD>{(page-1)*PER+i+1}</TD>
                <TD>{new Date(r.createdAt).toLocaleString()}</TD>
                <TD>{r.input?.temperature}°C</TD>
                <TD>{r.input?.salinity}</TD>
                <TD>{r.input?.oxygen}</TD>
                <TD>{r.input?.chlorophyll}</TD>
                <TD>{MONTH_NAMES[r.input?.month]??"-"}</TD>
                <TD>{r.input?.depth}m</TD>
                <TD><strong style={{color:"#fff"}}>{r.fish_abundance}</strong></TD>
                <TD style={{color:"#90caf9"}}>{r.rf_prediction}</TD>
                <TD style={{color:"#90caf9"}}>{r.xgb_prediction}</TD>
                <TD><Badge label={r.category} color={CAT_COLOR[r.category]} /></TD>
                <TD><DelBtn onClick={()=>handleDel(r._id)} loading={del===r._id}/></TD>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
      <Pagination page={page} pages={pages} setPage={setPage} />
    </>
  );
}

// ── Feature 2: Species ────────────────────────────────────────────────────────
function SpeciesHistory() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [del,     setDel]     = useState(null);

  useEffect(()=>{
    axios.get(`${API}/species-history`)
      .then(r=>setData(r.data)).catch(()=>toast.error("Failed to load species history"))
      .finally(()=>setLoading(false));
  },[]);

  const handleDel = async(id)=>{
    setDel(id);
    try{ await axios.delete(`${API}/species-history/${id}`);
      setData(d=>d.filter(r=>r._id!==id)); toast.success("Record deleted."); }
    catch{ toast.error("Delete failed."); } finally{ setDel(null); }
  };

  const exportCSV=()=>{
    const h=["Date","Species","Scientific","Confidence","Conservation","Habitat"];
    const rows=data.map(r=>[new Date(r.createdAt).toLocaleString(),
      r.common_name,r.scientific_name,r.confidence,r.conservation,r.habitat]);
    dl([h,...rows].map(r=>r.join(",")).join("\n"),"species_history.csv");
    toast.success("CSV exported!");
  };

  if(loading) return [1,2,3].map(i=><SkeletonCard key={i}/>);
  if(!data.length) return <EmptyState icon="🐠" message="No species identified yet"/>;

  const topSpecies = data.reduce((acc,r)=>{
    acc[r.common_name]=(acc[r.common_name]||0)+1; return acc;},{});
  const mostCommon = Object.entries(topSpecies).sort((a,b)=>b[1]-a[1])[0];

  return(
    <>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",
        gap:".7rem",marginBottom:"1.2rem"}}>
        <StatCard label="Total Identified" value={data.length}/>
        <StatCard label="Most Common" value={mostCommon?.[0]??"-"} color="#1e90ff"/>
        <StatCard label="Avg Confidence"
          value={`${(data.reduce((s,r)=>s+r.confidence,0)/data.length).toFixed(1)}%`}/>
        <StatCard label="High Confidence (>80%)"
          value={data.filter(r=>r.confidence>=80).length} color="#2e7d32"/>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:".7rem"}}>
        <button onClick={exportCSV} style={exportBtn}>⬇ Export CSV</button>
      </div>
      <div style={{display:"grid",
        gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:"1rem"}}>
        {data.map(r=>(
          <div key={r._id} style={{background:"#1a2d44",borderRadius:12,padding:"1rem",
            border:"1px solid #1e3a5a",position:"relative"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <strong style={{color:"#fff",display:"block"}}>{r.common_name}</strong>
                <em style={{color:"#90caf9",fontSize:".78rem"}}>{r.scientific_name}</em>
              </div>
              <DelBtn onClick={()=>handleDel(r._id)} loading={del===r._id}/>
            </div>
            <div style={{margin:".5rem 0"}}>
              <Badge label={r.conservation||"Not evaluated"}
                color={consColor(r.conservation)}/>
            </div>
            <div style={{background:"#0d1b2a",borderRadius:8,height:8,overflow:"hidden",marginBottom:".4rem"}}>
              <div style={{height:"100%",borderRadius:8,
                background:r.confidence>=80?"#2e7d32":r.confidence>=50?"#f57f17":"#c62828",
                width:`${r.confidence}%`,transition:"width .7s"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:".75rem",color:"#607d8b"}}>
              <span>{r.confidence?.toFixed(1)}% confidence</span>
              <span>{new Date(r.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Feature 3: Ecosystem ──────────────────────────────────────────────────────
function EcosystemHistory() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [del,     setDel]     = useState(null);
  const [page,    setPage]    = useState(1);
  const PER=10;

  useEffect(()=>{
    axios.get(`${API}/ecosystem-history`)
      .then(r=>setData(r.data)).catch(()=>toast.error("Failed to load ecosystem history"))
      .finally(()=>setLoading(false));
  },[]);

  const handleDel=async(id)=>{
    setDel(id);
    try{ await axios.delete(`${API}/ecosystem-history/${id}`);
      setData(d=>d.filter(r=>r._id!==id)); toast.success("Record deleted."); }
    catch{ toast.error("Delete failed."); } finally{ setDel(null); }
  };

  const exportCSV=()=>{
    const h=["Date","Score","Category","Temp","Salinity","O2","Chl-a","pH","Nitrate","Fish","Bio"];
    const rows=data.map(r=>[new Date(r.createdAt).toLocaleString(),
      r.health_score,r.category,r.parameters?.temperature,r.parameters?.salinity,
      r.parameters?.dissolved_o2,r.parameters?.chlorophyll,r.parameters?.ph,
      r.parameters?.nitrate,r.parameters?.fish_index,r.parameters?.biodiversity]);
    dl([h,...rows].map(r=>r.join(",")).join("\n"),"ecosystem_history.csv");
    toast.success("CSV exported!");
  };

  const paged=data.slice((page-1)*PER,page*PER);
  const pages=Math.max(1,Math.ceil(data.length/PER));
  const avg=data.length?(data.reduce((s,r)=>s+r.health_score,0)/data.length).toFixed(1):0;

  if(loading) return [1,2,3].map(i=><SkeletonCard key={i}/>);
  if(!data.length) return <EmptyState icon="🌊" message="No ecosystem assessments yet"/>;

  return(
    <>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",
        gap:".7rem",marginBottom:"1.2rem"}}>
        <StatCard label="Total" value={data.length}/>
        <StatCard label="Avg Score" value={`${avg}/100`}/>
        <StatCard label="Healthy" value={data.filter(r=>r.category==="Healthy").length} color="#2e7d32"/>
        <StatCard label="Critical" value={data.filter(r=>r.category==="Critical").length} color="#c62828"/>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:".7rem"}}>
        <button onClick={exportCSV} style={exportBtn}>⬇ Export CSV</button>
      </div>
      <TableWrap>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
          <thead><tr>
            <TH>#</TH><TH>Date</TH><TH>Score</TH><TH>Category</TH>
            <TH>Temp</TH><TH>O₂</TH><TH>pH</TH><TH>Nitrate</TH><TH>Method</TH><TH></TH>
          </tr></thead>
          <tbody>
            {paged.map((r,i)=>(
              <tr key={r._id} style={{background:i%2?"#162940":"transparent"}}>
                <TD>{(page-1)*PER+i+1}</TD>
                <TD>{new Date(r.createdAt).toLocaleString()}</TD>
                <TD><strong style={{color:"#fff"}}>{r.health_score}</strong></TD>
                <TD><Badge label={r.category} color={CAT_COLOR[r.category]}/></TD>
                <TD>{r.parameters?.temperature??"-"}°C</TD>
                <TD>{r.parameters?.dissolved_o2??"-"}</TD>
                <TD>{r.parameters?.ph??"-"}</TD>
                <TD>{r.parameters?.nitrate??"-"}</TD>
                <TD style={{fontSize:".72rem",color:"#90caf9"}}>{r.method?.split(" ")[0]}</TD>
                <TD><DelBtn onClick={()=>handleDel(r._id)} loading={del===r._id}/></TD>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
      <Pagination page={page} pages={pages} setPage={setPage}/>
    </>
  );
}

// ── Feature 4: Otolith ────────────────────────────────────────────────────────
function OtolithHistory() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [del,     setDel]     = useState(null);

  useEffect(()=>{
    axios.get(`${API}/otolith-history`)
      .then(r=>setData(r.data)).catch(()=>toast.error("Failed to load otolith history"))
      .finally(()=>setLoading(false));
  },[]);

  const handleDel=async(id)=>{
    setDel(id);
    try{ await axios.delete(`${API}/otolith-history/${id}`);
      setData(d=>d.filter(r=>r._id!==id)); toast.success("Record deleted."); }
    catch{ toast.error("Delete failed."); } finally{ setDel(null); }
  };

  const exportCSV=()=>{
    const h=["Date","Age(yrs)","Rings","Growth Rate","Stock","Confidence"];
    const rows=data.map(r=>[new Date(r.createdAt).toLocaleString(),
      r.age_years,r.ring_count,r.growth_rate,r.stock_id,r.confidence]);
    dl([h,...rows].map(r=>r.join(",")).join("\n"),"otolith_history.csv");
    toast.success("CSV exported!");
  };

  if(loading) return [1,2,3].map(i=><SkeletonCard key={i}/>);
  if(!data.length) return <EmptyState icon="🦴" message="No otolith analyses yet"/>;

  const avgAge=(data.reduce((s,r)=>s+r.age_years,0)/data.length).toFixed(1);

  return(
    <>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",
        gap:".7rem",marginBottom:"1.2rem"}}>
        <StatCard label="Total" value={data.length}/>
        <StatCard label="Avg Age" value={`${avgAge} yrs`}/>
        <StatCard label="Fast Growth" value={data.filter(r=>r.growth_rate==="Fast").length} color="#2e7d32"/>
        <StatCard label="Slow Growth" value={data.filter(r=>r.growth_rate==="Slow").length} color="#f57f17"/>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:".7rem"}}>
        <button onClick={exportCSV} style={exportBtn}>⬇ Export CSV</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:"1rem"}}>
        {data.map(r=>(
          <div key={r._id} style={{background:"#1a2d44",borderRadius:12,padding:"1rem",
            border:`1px solid ${CAT_COLOR[r.growth_rate]??"#1e3a5a"}`,
            borderLeft:`4px solid ${CAT_COLOR[r.growth_rate]??"#607d8b"}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".5rem"}}>
              <span style={{fontSize:"1.6rem"}}>🦴</span>
              <DelBtn onClick={()=>handleDel(r._id)} loading={del===r._id}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".4rem",marginBottom:".5rem"}}>
              {[
                {l:"Age",v:`${r.age_years} yrs`},
                {l:"Rings",v:r.ring_count},
                {l:"Growth",v:<Badge label={r.growth_rate} color={CAT_COLOR[r.growth_rate]}/>},
                {l:"Stock",v:r.stock_id?.replace("stock_","Stock ")},
              ].map(({l,v})=>(
                <div key={l} style={{background:"#0d1b2a",borderRadius:8,padding:".4rem .6rem"}}>
                  <span style={{fontSize:".68rem",color:"#90caf9",display:"block"}}>{l}</span>
                  <strong style={{fontSize:".85rem",color:"#fff"}}>{v}</strong>
                </div>
              ))}
            </div>
            <div style={{fontSize:".72rem",color:"#607d8b"}}>
              {new Date(r.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Feature 5: eDNA ───────────────────────────────────────────────────────────
function EdnaHistory() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [del,     setDel]     = useState(null);
  const [filter,  setFilter]  = useState("");

  useEffect(()=>{
    axios.get(`${API}/edna-history`)
      .then(r=>setData(r.data)).catch(()=>toast.error("Failed to load eDNA history"))
      .finally(()=>setLoading(false));
  },[]);

  const handleDel=async(id)=>{
    setDel(id);
    try{ await axios.delete(`${API}/edna-history/${id}`);
      setData(d=>d.filter(r=>r._id!==id)); toast.success("Record deleted."); }
    catch{ toast.error("Delete failed."); } finally{ setDel(null); }
  };

  const exportCSV=()=>{
    const h=["Date","Species","Scientific","Match%","E-value","Method","Conservation"];
    const rows=data.map(r=>[new Date(r.createdAt).toLocaleString(),
      r.species_name,r.scientific_name,r.match_percentage,
      r.e_value??"N/A",r.method_used,r.conservation_status]);
    dl([h,...rows].map(r=>r.join(",")).join("\n"),"edna_history.csv");
    toast.success("CSV exported!");
  };

  const filtered=filter
    ?data.filter(r=>r.species_name?.toLowerCase().includes(filter.toLowerCase())
                 ||r.scientific_name?.toLowerCase().includes(filter.toLowerCase()))
    :data;

  if(loading) return [1,2,3].map(i=><SkeletonCard key={i}/>);
  if(!data.length) return <EmptyState icon="🧬" message="No eDNA matches yet"/>;

  const avgMatch=(data.reduce((s,r)=>s+r.match_percentage,0)/data.length).toFixed(1);

  return(
    <>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",
        gap:".7rem",marginBottom:"1.2rem"}}>
        <StatCard label="Total" value={data.length}/>
        <StatCard label="Avg Match" value={`${avgMatch}%`}/>
        <StatCard label="NCBI" value={data.filter(r=>r.method_used==="NCBI").length} color="#1e90ff"/>
        <StatCard label="Local DB" value={data.filter(r=>r.method_used==="Local").length} color="#f57f17"/>
      </div>
      <div style={{display:"flex",gap:".7rem",justifyContent:"space-between",
        alignItems:"center",marginBottom:".7rem",flexWrap:"wrap"}}>
        <input value={filter} onChange={e=>setFilter(e.target.value)}
          placeholder="Filter by species…"
          style={{background:"#0d1b2a",border:"1px solid #1e3a5a",color:"#e0e6ed",
            padding:".38rem .8rem",borderRadius:8,fontSize:".82rem",outline:"none",
            minWidth:200}}/>
        <button onClick={exportCSV} style={exportBtn}>⬇ Export CSV</button>
      </div>
      <TableWrap>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:650}}>
          <thead><tr>
            <TH>#</TH><TH>Date</TH><TH>Species</TH><TH>Scientific</TH>
            <TH>Match%</TH><TH>Method</TH><TH>Conservation</TH><TH></TH>
          </tr></thead>
          <tbody>
            {filtered.map((r,i)=>(
              <tr key={r._id} style={{background:i%2?"#162940":"transparent"}}>
                <TD>{i+1}</TD>
                <TD>{new Date(r.createdAt).toLocaleString()}</TD>
                <TD><strong style={{color:"#fff"}}>{r.species_name}</strong></TD>
                <TD><em style={{color:"#90caf9"}}>{r.scientific_name}</em></TD>
                <TD>
                  <span style={{fontWeight:700,
                    color:r.match_percentage>=85?"#2e7d32":r.match_percentage>=60?"#f57f17":"#c62828"}}>
                    {r.match_percentage}%
                  </span>
                </TD>
                <TD><Badge label={r.method_used}
                  color={r.method_used==="NCBI"?"#0d3358":"#1a2d44"}/></TD>
                <TD><Badge label={r.conservation_status??"-"} color={consColor(r.conservation_status)}/></TD>
                <TD><DelBtn onClick={()=>handleDel(r._id)} loading={del===r._id}/></TD>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════
function dl(content, name) {
  const a = document.createElement("a");
  a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(content)}`;
  a.download = name; a.click();
}

function consColor(s) {
  if (!s) return "#607d8b";
  const l = s.toLowerCase();
  if (l.includes("least"))      return "#2e7d32";
  if (l.includes("near"))       return "#f57f17";
  if (l.includes("vulnerable")) return "#e65100";
  if (l.includes("endangered")) return "#c62828";
  return "#607d8b";
}

function Pagination({ page, pages, setPage }) {
  if (pages <= 1) return null;
  return (
    <div style={{ display:"flex", justifyContent:"center", gap:".35rem",
      marginTop:"1rem", flexWrap:"wrap" }}>
      {["«","‹",...Array.from({length:pages},(_,i)=>i+1),"›","»"].map((p,i)=>{
        const isNum = typeof p === "number";
        const target = p==="«"?1:p==="‹"?page-1:p==="›"?page+1:p==="»"?pages:p;
        const disabled = (p==="«"||p==="‹")&&page===1 || (p==="›"||p==="»")&&page===pages;
        return (
          <button key={i} onClick={()=>!disabled&&setPage(target)} disabled={disabled}
            style={{ background: isNum&&p===page?"#1e90ff":"#1a2d44",
              border:"1px solid #1e3a5a", color: isNum&&p===page?"#fff":"#90caf9",
              width:34, height:34, borderRadius:8, cursor:disabled?"not-allowed":"pointer",
              opacity:disabled?.35:1, fontWeight:isNum&&p===page?700:400 }}>
            {p}
          </button>
        );
      })}
    </div>
  );
}

const exportBtn = {
  background:"#0d3358", border:"1px solid #1e90ff", color:"#90caf9",
  padding:".38rem .9rem", borderRadius:8, fontSize:".82rem", cursor:"pointer",
};

// ── TABS CONFIG ───────────────────────────────────────────────────────────────
const TABS = [
  { key:"abundance", label:"📊 Fish",      component:<AbundanceHistory/> },
  { key:"species",   label:"🐠 Species",   component:<SpeciesHistory/> },
  { key:"ecosystem", label:"🌊 Ecosystem", component:<EcosystemHistory/> },
  { key:"otolith",   label:"🦴 Otolith",   component:<OtolithHistory/> },
  { key:"edna",      label:"🧬 eDNA",      component:<EdnaHistory/> },
];

// ══════════════════════════════════════════════════════════════════════════════
// MAIN HISTORY PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function History() {
  const [activeTab, setActiveTab] = useState("abundance");
  const active = TABS.find(t => t.key === activeTab);

  return (
    <div style={{ maxWidth:1400, margin:"auto", padding:"1.5rem 1rem" }}>
      {/* Header */}
      <div style={{ marginBottom:"1.5rem" }}>
        <h1 style={{ color:"#1e90ff", fontSize:"1.8rem", marginBottom:".3rem" }}>
          📋 Prediction History
        </h1>
        <p style={{ color:"#607d8b", fontSize:".85rem" }}>
          All 5 features — view, filter, export and delete past analyses
        </p>
      </div>

      {/* Tabs */}
      <div className="history-tabs" style={{ marginBottom:"1.5rem" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{
              background: activeTab===t.key ? "#1e90ff" : "#1a2d44",
              border: `1px solid ${activeTab===t.key?"#1e90ff":"#1e3a5a"}`,
              color: activeTab===t.key ? "#fff" : "#90caf9",
              padding: ".45rem 1rem", borderRadius:10, cursor:"pointer",
              fontSize:".85rem", fontWeight:600, whiteSpace:"nowrap",
              transition:"all .2s",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div style={{ animation:"fadeIn .3s ease" }}>
        {active?.component}
      </div>
    </div>
  );
}