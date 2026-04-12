import { useState } from "react";

const PARAMS = [
  { key: "temperature",  label: "Sea Surface Temperature (°C)", min: 0,   max: 40,   step: 0.1,  default: 27   },
  { key: "salinity",     label: "Salinity (PSU)",               min: 0,   max: 45,   step: 0.1,  default: 33   },
  { key: "oxygen",       label: "Dissolved Oxygen (mg/L)",      min: 0,   max: 15,   step: 0.1,  default: 6    },
  { key: "chlorophyll",  label: "Chlorophyll-a (mg/m³)",        min: 0,   max: 20,   step: 0.01, default: 1.5  },
  { key: "month",        label: "Month (1–12)",                 min: 1,   max: 12,   step: 1,    default: 6    },
  { key: "depth",        label: "Depth (m)",                    min: 1,   max: 1000, step: 1,    default: 100  },
];

const MONTH_NAMES = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function PredictionForm({ onPredict, loading }) {
  const [values, setValues] = useState(
    Object.fromEntries(PARAMS.map((p) => [p.key, p.default]))
  );

  const update = (key, val) => setValues((v) => ({ ...v, [key]: Number(val) }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onPredict(values);
  };

  return (
    <form className="pred-form" onSubmit={handleSubmit}>
      <h2>Ocean Parameters</h2>
      {PARAMS.map((p) => (
        <div className="slider-row" key={p.key}>
          <label>
            {p.label}
            <span className="slider-value">
              {p.key === "month" ? MONTH_NAMES[values[p.key]] : values[p.key]}
            </span>
          </label>
          <input
            type="range"
            min={p.min} max={p.max} step={p.step}
            value={values[p.key]}
            onChange={(e) => update(p.key, e.target.value)}
          />
          <div className="slider-range">
            <span>{p.min}</span><span>{p.max}</span>
          </div>
        </div>
      ))}
      <button type="submit" className="btn-predict" disabled={loading}>
        {loading ? "Predicting…" : "🔍 Predict Fish Abundance"}
      </button>
    </form>
  );
}