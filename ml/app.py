"""
app.py — Flask API
Endpoints:
  POST /predict            → fish abundance     (Feature 1)
  GET  /map-data           → map data           (Feature 1)
  POST /predict-species    → fish species ID    (Feature 2)
  POST /ecosystem-health   → ecosystem score    (Feature 3)
  GET  /health             → health check
"""

import pickle, os, json, io
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image

import tensorflow as tf

# ── M1 Mac: enable Metal GPU ──────────────────────────────────────────────────
gpus = tf.config.list_physical_devices("GPU")
if gpus:
    for gpu in gpus:
        tf.config.experimental.set_memory_growth(gpu, True)

app = Flask(__name__)
CORS(app)

BASE = os.path.dirname(__file__)

# ══════════════════════════════════════════════════════════════════════════════
# FEATURE 1 — Fish Abundance Models
# ══════════════════════════════════════════════════════════════════════════════
with open(os.path.join(BASE, "models", "rf_model.pkl"),  "rb") as f:
    rf_model = pickle.load(f)
with open(os.path.join(BASE, "models", "xgb_model.pkl"), "rb") as f:
    xgb_model = pickle.load(f)

ABUNDANCE_FEATURES = ["temperature", "salinity", "oxygen", "chlorophyll", "month", "depth"]

# ══════════════════════════════════════════════════════════════════════════════
# FEATURE 2 — Species Identification Model
# ══════════════════════════════════════════════════════════════════════════════
SPECIES_MODEL = None
CLASS_INDICES = None
IDX_TO_CLASS  = None
IMG_SIZE      = 224

SPECIES_INFO = {
    "rohu":            {"common_name": "Rohu",               "scientific_name": "Labeo rohita",              "description": "A large freshwater fish widely found in Indian rivers. Highly valued commercially and nutritionally.", "conservation": "Least Concern",   "habitat": "Freshwater rivers and lakes"},
    "catla":           {"common_name": "Catla",              "scientific_name": "Catla catla",               "description": "One of the fastest-growing freshwater fish in India. Major aquaculture species.",                     "conservation": "Least Concern",   "habitat": "Freshwater"},
    "hilsa":           {"common_name": "Hilsa Shad",         "scientific_name": "Tenualosa ilisha",          "description": "The national fish of Bangladesh. Prized for its rich flavour in South Asian cuisine.",               "conservation": "Near Threatened", "habitat": "Marine and freshwater (anadromous)"},
    "indian_mackerel": {"common_name": "Indian Mackerel",    "scientific_name": "Rastrelliger kanagurta",    "description": "One of the most commercially important marine fish species along the Indian coast.",                  "conservation": "Least Concern",   "habitat": "Coastal marine waters"},
    "pomfret":         {"common_name": "Silver Pomfret",     "scientific_name": "Pampus argenteus",          "description": "A highly prized food fish found across the Indo-Pacific. Known for its delicate flavour.",            "conservation": "Near Threatened", "habitat": "Tropical marine waters"},
    "sardine":         {"common_name": "Indian Oil Sardine", "scientific_name": "Sardinella longiceps",      "description": "Most abundant fish along the west coast of India. Important for fish meal and oil.",                 "conservation": "Least Concern",   "habitat": "Coastal pelagic waters"},
    "snapper":         {"common_name": "Red Snapper",        "scientific_name": "Lutjanus campechanus",      "description": "A popular reef fish found in tropical Indian Ocean waters. Excellent food fish.",                    "conservation": "Vulnerable",      "habitat": "Coral reefs and rocky shores"},
    "tuna":            {"common_name": "Yellowfin Tuna",     "scientific_name": "Thunnus albacares",         "description": "A highly migratory pelagic fish crucial to Indian Ocean fisheries.",                               "conservation": "Near Threatened", "habitat": "Open ocean (epipelagic)"},
    "grouper":         {"common_name": "Orange-spotted Grouper", "scientific_name": "Epinephelus coioides", "description": "An important reef fish species found in Indian coastal waters and coral reefs.",                    "conservation": "Vulnerable",      "habitat": "Coral reefs and estuaries"},
    "seer_fish":       {"common_name": "Seer Fish / King Fish",  "scientific_name": "Scomberomorus commerson","description": "One of the most prized marine food fish in India. Highly valued in coastal markets.",              "conservation": "Least Concern",   "habitat": "Coastal and offshore marine"},
}

def load_species_model():
    global SPECIES_MODEL, CLASS_INDICES, IDX_TO_CLASS
    model_path = os.path.join(BASE, "models", "species_model.keras")
    index_path = os.path.join(BASE, "models", "class_indices.json")
    if not os.path.exists(model_path):
        model_path = os.path.join(BASE, "models", "species_model.h5")
    if os.path.exists(model_path) and os.path.exists(index_path):
        SPECIES_MODEL = tf.keras.models.load_model(model_path)
        with open(index_path) as f:
            CLASS_INDICES = json.load(f)
        IDX_TO_CLASS = {v: k for k, v in CLASS_INDICES.items()}
        print("✅ Species model loaded")
    else:
        print("⚠️  Species model not found — run species_model.py first")

load_species_model()

def preprocess_image(file_bytes):
    img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    img = img.resize((IMG_SIZE, IMG_SIZE))
    arr = np.array(img, dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)

# ══════════════════════════════════════════════════════════════════════════════
# FEATURE 3 — Ecosystem Health Model
# ══════════════════════════════════════════════════════════════════════════════
ECO_MODEL  = None
ECO_SCALER = None
ECO_LABELS = None

def load_ecosystem_model():
    global ECO_MODEL, ECO_SCALER, ECO_LABELS
    model_path  = os.path.join(BASE, "models", "ecosystem_model.pkl")
    scaler_path = os.path.join(BASE, "models", "ecosystem_scaler.pkl")
    label_path  = os.path.join(BASE, "models", "ecosystem_labels.json")
    if os.path.exists(model_path):
        with open(model_path,  "rb") as f: ECO_MODEL  = pickle.load(f)
        with open(scaler_path, "rb") as f: ECO_SCALER = pickle.load(f)
        with open(label_path)        as f: ECO_LABELS = json.load(f)
        print("✅ Ecosystem health model loaded")
    else:
        print("⚠️  Ecosystem model not found — run ecosystem_model.py first")

load_ecosystem_model()

def weighted_health_score(p):
    """Rule-based weighted score — used as fallback or primary numeric value."""
    o2_score   = max(0, min(100, 100 - abs(p["dissolved_o2"]  - 7)    * 20))
    chl_score  = (min(100, p["chlorophyll"] / 2.0 * 100)
                  if p["chlorophyll"] <= 2.0
                  else max(0, 100 - (p["chlorophyll"] - 2.0) * 15))
    temp_score = max(0, min(100, 100 - abs(p["temperature"]   - 26.5) * 8))
    sal_score  = max(0, min(100, 100 - abs(p["salinity"]      - 34)   * 10))
    ph_score   = max(0, min(100, 100 - abs(p["ph"]            - 8.15) * 80))
    nit_score  = max(0, min(100, 100 - p["nitrate"] * 4))

    score = (0.25 * o2_score  + 0.20 * chl_score  + 0.18 * temp_score +
             0.12 * sal_score + 0.10 * ph_score    + 0.08 * nit_score  +
             0.04 * p["fish_index"] + 0.03 * p["biodiversity"])

    impacts = {
        "dissolved_o2":  round(o2_score,  1),
        "chlorophyll":   round(chl_score, 1),
        "temperature":   round(temp_score,1),
        "salinity":      round(sal_score, 1),
        "ph":            round(ph_score,  1),
        "nitrate":       round(nit_score, 1),
        "fish_index":    round(p["fish_index"],   1),
        "biodiversity":  round(p["biodiversity"], 1),
    }
    return round(score, 1), impacts

def build_recommendations(params):
    recs = []
    if params["dissolved_o2"] < 4:
        recs.append("🚨 Oxygen critically low — immediate fishing ban advised")
    elif params["dissolved_o2"] < 5.5:
        recs.append("⚠️ Dissolved oxygen below optimal — monitor fish mortality")
    if params["chlorophyll"] > 5:
        recs.append("🚨 Algal bloom detected — restrict aquaculture activities")
    elif params["chlorophyll"] > 3:
        recs.append("⚠️ High chlorophyll — potential eutrophication risk")
    if params["temperature"] > 30:
        recs.append("🌡️ Sea surface temperature critical — coral bleaching risk")
    elif params["temperature"] > 28.5:
        recs.append("⚠️ Temperature above normal — monitor species migration")
    if params["ph"] < 7.8:
        recs.append("🚨 Ocean acidification detected — affects shell-forming species")
    elif params["ph"] < 8.0:
        recs.append("⚠️ pH slightly low — monitor carbonate system")
    if params["nitrate"] > 15:
        recs.append("⚠️ High nitrate — possible agricultural runoff, restrict trawling")
    if params["salinity"] < 30:
        recs.append("⚠️ Low salinity — possible freshwater influx, check river discharge")
    if params["fish_index"] < 30:
        recs.append("📉 Fish abundance critically low — enforce no-take zones")
    if params["biodiversity"] < 30:
        recs.append("🔴 Biodiversity index critical — habitat restoration needed")
    if not recs:
        recs.append("✅ All parameters within healthy range — continue monitoring")
    return recs

# ══════════════════════════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════════════════════════

# ── Health check ──────────────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "models": {
            "abundance":  ["RandomForest", "XGBoost"],
            "species":    "loaded" if SPECIES_MODEL else "not loaded",
            "ecosystem":  "loaded" if ECO_MODEL     else "not loaded",
        }
    })

# ── Feature 1: Fish Abundance ─────────────────────────────────────────────────
@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(force=True)
    required = {
        "temperature": (0,40), "salinity": (0,45), "oxygen":    (0,15),
        "chlorophyll": (0,20), "month":   (1,12),  "depth":  (1,1000),
    }
    vals = {}
    for field, (lo, hi) in required.items():
        v = data.get(field)
        if v is None: return jsonify({"error": f"Missing: {field}"}), 400
        try: v = float(v)
        except: return jsonify({"error": f"Invalid: {field}"}), 400
        if not (lo <= v <= hi): return jsonify({"error": f"{field} out of range [{lo},{hi}]"}), 400
        vals[field] = v

    row      = pd.DataFrame([[vals[f] for f in ABUNDANCE_FEATURES]], columns=ABUNDANCE_FEATURES)
    rf_pred  = float(rf_model.predict(row)[0])
    xgb_pred = float(xgb_model.predict(row)[0])
    ensemble = round((rf_pred + xgb_pred) / 2, 2)

    if ensemble >= 80:   category, color = "High",   "#2e7d32"
    elif ensemble >= 40: category, color = "Medium", "#f57f17"
    else:                category, color = "Low",    "#c62828"

    return jsonify({
        "fish_abundance_kg_km2": ensemble,
        "rf_prediction":         round(rf_pred,  2),
        "xgb_prediction":        round(xgb_pred, 2),
        "category": category, "color": color, "input": vals,
    })

@app.route("/map-data", methods=["GET"])
def map_data():
    csv_path = os.path.join(BASE, "data", "fish_data.csv")
    if not os.path.exists(csv_path):
        return jsonify({"error": "Dataset not found"}), 404
    df     = pd.read_csv(csv_path)
    sample = df.sample(min(500, len(df)), random_state=1).copy()
    def cat(v): return "High" if v >= 80 else ("Medium" if v >= 40 else "Low")
    sample["category"] = sample["fish_abundance"].apply(cat)
    records = sample[["latitude","longitude","fish_abundance",
                       "temperature","chlorophyll","month","category"]
                    ].to_dict(orient="records")
    return jsonify({"count": len(records), "data": records})

# ── Feature 2: Species Identification ────────────────────────────────────────
@app.route("/predict-species", methods=["POST"])
def predict_species():
    if SPECIES_MODEL is None:
        return jsonify({"error": "Species model not loaded. Run species_model.py first."}), 503
    if "image" not in request.files:
        return jsonify({"error": "No image file. Use key: 'image'"}), 400
    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400
    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in {"jpg","jpeg","png","webp"}:
        return jsonify({"error": "Only JPG/PNG/WEBP supported"}), 400
    try:
        file_bytes = file.read()
        img_array  = preprocess_image(file_bytes)
        preds      = SPECIES_MODEL.predict(img_array, verbose=0)[0]
        top3_idx   = np.argsort(preds)[::-1][:3]
        best_idx   = int(top3_idx[0])
        best_label = IDX_TO_CLASS.get(best_idx, "unknown")
        confidence = float(preds[best_idx]) * 100
        info = SPECIES_INFO.get(best_label, {
            "common_name":    best_label.replace("_", " ").title(),
            "scientific_name":"Unknown",
            "description":    "No description available.",
            "conservation":   "Not evaluated",
            "habitat":        "Unknown",
        })
        top3 = [{
            "rank":        i + 1,
            "species":     IDX_TO_CLASS.get(int(top3_idx[i]), "unknown"),
            "common_name": SPECIES_INFO.get(IDX_TO_CLASS.get(int(top3_idx[i]),""),{})
                           .get("common_name",
                                IDX_TO_CLASS.get(int(top3_idx[i]),"").replace("_"," ").title()),
            "confidence":  round(float(preds[top3_idx[i]]) * 100, 2),
        } for i in range(len(top3_idx))]

        return jsonify({
            "species_key":     best_label,
            "common_name":     info["common_name"],
            "scientific_name": info["scientific_name"],
            "confidence":      round(confidence, 2),
            "description":     info["description"],
            "conservation":    info["conservation"],
            "habitat":         info["habitat"],
            "top3":            top3,
        })
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500

# ── Feature 3: Ecosystem Health ───────────────────────────────────────────────
@app.route("/ecosystem-health", methods=["POST"])
def ecosystem_health():
    data = request.get_json(force=True)

    REQUIRED = {
        "temperature":  (15,  40),
        "salinity":     (20,  42),
        "dissolved_o2": (0,   15),
        "chlorophyll":  (0,   20),
        "ph":           (7.0, 8.8),
        "nitrate":      (0,   50),
        "fish_index":   (0,   100),
        "biodiversity": (0,   100),
    }
    params = {}
    for field, (lo, hi) in REQUIRED.items():
        v = data.get(field)
        if v is None:
            return jsonify({"error": f"Missing field: {field}"}), 400
        try: v = float(v)
        except: return jsonify({"error": f"Invalid value: {field}"}), 400
        if not (lo <= v <= hi):
            return jsonify({"error": f"{field} must be {lo}–{hi}"}), 400
        params[field] = v

    # Always compute rule-based score
    rule_score, param_impacts = weighted_health_score(params)

    final_score    = rule_score
    ml_confidence  = 0.0
    method         = "Rule-based"

    # ML prediction (if model loaded)
    if ECO_MODEL and ECO_SCALER and ECO_LABELS:
        try:
            features   = ECO_LABELS["features"]
            row        = np.array([[params[f] for f in features]])
            row_scaled = ECO_SCALER.transform(row)
            proba      = ECO_MODEL.predict_proba(row_scaled)[0]
            pred_idx   = int(np.argmax(proba))
            ml_confidence = float(proba[pred_idx])
            ml_category   = ECO_LABELS["classes"][pred_idx]

            if ml_confidence >= 0.6:
                method         = "ML + Rule-based"
                final_category = ml_category
            else:
                method         = "Rule-based (low ML confidence)"
                final_category = ("Healthy"  if rule_score >= 71
                                  else "Moderate" if rule_score >= 41
                                  else "Critical")
        except Exception as e:
            print(f"⚠️ Ecosystem ML error: {e}")
            final_category = ("Healthy"  if rule_score >= 71
                               else "Moderate" if rule_score >= 41
                               else "Critical")
            method = "Rule-based (ML error)"
    else:
        final_category = ("Healthy"  if rule_score >= 71
                           else "Moderate" if rule_score >= 41
                           else "Critical")

    color = ("#2e7d32" if final_category == "Healthy"
             else "#f57f17" if final_category == "Moderate"
             else "#c62828")

    return jsonify({
        "health_score":      final_score,
        "category":          final_category,
        "color":             color,
        "method":            method,
        "ml_confidence":     round(ml_confidence * 100, 1),
        "parameter_impacts": param_impacts,
        "recommendations":   build_recommendations(params),
        "input":             params,
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)