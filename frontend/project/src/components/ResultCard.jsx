export default function ResultCard({ result }) {
  if (!result) return null;

  const { fish_abundance_kg_km2, rf_prediction, xgb_prediction, category, color } = result;

  const icons = { High: "🟢", Medium: "🟡", Low: "🔴" };

  return (
    <div className="result-card" style={{ borderLeft: `6px solid ${color}` }}>
      <h2>Prediction Result</h2>
      <div className="result-main">
        <span className="result-value">{fish_abundance_kg_km2}</span>
        <span className="result-unit">kg / km²</span>
      </div>
      <div className="result-badge" style={{ background: color }}>
        {icons[category]} {category} Abundance
      </div>
      <div className="model-breakdown">
        <div>
          <span>Random Forest</span>
          <strong>{rf_prediction} kg/km²</strong>
        </div>
        <div>
          <span>XGBoost</span>
          <strong>{xgb_prediction} kg/km²</strong>
        </div>
        <div>
          <span>Ensemble (avg)</span>
          <strong>{fish_abundance_kg_km2} kg/km²</strong>
        </div>
      </div>
    </div>
  );
}