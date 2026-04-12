"""
app.py — Flask API for Fish Abundance Prediction
Run: python app.py
Endpoints:
  POST /predict       → predict fish abundance from ocean params
  GET  /map-data      → return all CSV records as JSON for Leaflet map
  GET  /health        → health check
"""
import pickle, os
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # allow React dev server (port 3000) to call this API

# ── Load models once at startup ───────────────────────────────────────────────
BASE = os.path.dirname(__file__)

with open(os.path.join(BASE, "models", "rf_model.pkl"),  "rb") as f:
    rf_model = pickle.load(f)

with open(os.path.join(BASE, "models", "xgb_model.pkl"), "rb") as f:
    xgb_model = pickle.load(f)

FEATURES = ["temperature", "salinity", "oxygen", "chlorophyll", "month", "depth"]

# ── Helper ────────────────────────────────────────────────────────────────────
def validate_input(data):
    """Return (values_dict, error_str). error_str is None on success."""
    required = {
        "temperature": (0, 40),
        "salinity":    (0, 45),
        "oxygen":      (0, 15),
        "chlorophyll": (0, 20),
        "month":       (1, 12),
        "depth":       (1, 1000),
    }
    vals = {}
    for field, (lo, hi) in required.items():
        v = data.get(field)
        if v is None:
            return None, f"Missing field: {field}"
        try:
            v = float(v)
        except (ValueError, TypeError):
            return None, f"Invalid value for {field}"
        if not (lo <= v <= hi):
            return None, f"{field} must be between {lo} and {hi}"
        vals[field] = v
    return vals, None

# ── Routes ────────────────────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "models": ["RandomForest", "XGBoost"]})


@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(force=True)
    vals, err = validate_input(data)
    if err:
        return jsonify({"error": err}), 400

    row = pd.DataFrame([[vals[f] for f in FEATURES]], columns=FEATURES)

    rf_pred  = float(rf_model.predict(row)[0])
    xgb_pred = float(xgb_model.predict(row)[0])
    ensemble = round((rf_pred + xgb_pred) / 2, 2)

    # Abundance category
    if ensemble >= 80:
        category, color = "High",   "#2e7d32"
    elif ensemble >= 40:
        category, color = "Medium", "#f57f17"
    else:
        category, color = "Low",    "#c62828"

    return jsonify({
        "fish_abundance_kg_km2": ensemble,
        "rf_prediction":         round(rf_pred,  2),
        "xgb_prediction":        round(xgb_pred, 2),
        "category":              category,
        "color":                 color,
        "input":                 vals,
    })


@app.route("/map-data", methods=["GET"])
def map_data():
    """Return all rows from the CSV as GeoJSON-ready JSON for Leaflet."""
    csv_path = os.path.join(BASE, "data", "fish_data.csv")
    if not os.path.exists(csv_path):
        return jsonify({"error": "Dataset not found"}), 404

    df = pd.read_csv(csv_path)

    # Reduce payload: sample 500 rows for the map
    sample = df.sample(min(500, len(df)), random_state=1).copy()

    def categorize(v):
        if v >= 80:   return "High"
        if v >= 40:   return "Medium"
        return "Low"

    sample["category"] = sample["fish_abundance"].apply(categorize)

    records = sample[[
        "latitude", "longitude", "fish_abundance",
        "temperature", "chlorophyll", "month", "category"
    ]].to_dict(orient="records")

    return jsonify({"count": len(records), "data": records})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)