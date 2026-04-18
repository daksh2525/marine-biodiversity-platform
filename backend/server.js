// server.js — Express + MongoDB backend
// Run: node server.js

require("dotenv").config();
const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");
const axios    = require("axios");
const multer   = require("multer");
const FormData = require("form-data");

const Prediction      = require("./models/Prediction");
const Location        = require("./models/Location");
const SpeciesResult   = require("./models/SpeciesResult");
const EcosystemHealth = require("./models/EcosystemHealth");   // ← Feature 3

const app       = express();
const PORT      = process.env.PORT || 5000;
const FLASK_URL = process.env.FLASK_URL || "http://localhost:5001";

app.use(cors());
app.use(express.json());

// ── Multer — image upload (memory storage, no disk writes) ───────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPG, PNG, WEBP images are allowed"), false);
  },
});

// ── MongoDB connection ────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/fishdb")
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

// ════════════════════════════════════════════════════════════════════════════
// FEATURE 1 — Fish Abundance Prediction
// ════════════════════════════════════════════════════════════════════════════

app.post("/api/predict", async (req, res) => {
  try {
    console.log("📥 req.body:", req.body);
    const { temperature, salinity, oxygen, chlorophyll, month, depth, latitude, longitude } = req.body;

    const fields  = { temperature, salinity, oxygen, chlorophyll, month, depth };
    const missing = Object.keys(fields).filter(k => fields[k] === undefined || fields[k] === null);
    if (missing.length)
      return res.status(400).json({ error: `Missing: ${missing.join(", ")}` });

    const inputData = {
      temperature: Number(temperature),
      salinity:    Number(salinity),
      oxygen:      Number(oxygen),
      chlorophyll: Number(chlorophyll),
      month:       Number(month),
      depth:       Number(depth),
    };

    console.log("📤 Sending to Flask:", inputData);
    const flaskRes = await axios.post(`${FLASK_URL}/predict`, inputData);
    const ml = flaskRes.data;
    console.log("📨 Flask response:", ml);

    const doc = await Prediction.create({
      input:          inputData,
      fish_abundance: ml.fish_abundance_kg_km2,
      rf_prediction:  ml.rf_prediction,
      xgb_prediction: ml.xgb_prediction,
      category:       ml.category,
      latitude:       Number(latitude)  || null,
      longitude:      Number(longitude) || null,
    });
    console.log("✅ Saved prediction:", doc._id, "| Abundance:", doc.fish_abundance);

    res.json({
      fish_abundance_kg_km2: ml.fish_abundance_kg_km2,
      rf_prediction:         ml.rf_prediction,
      xgb_prediction:        ml.xgb_prediction,
      category:              ml.category,
      color:                 ml.color,
      input:                 inputData,
      _id:                   doc._id,
      createdAt:             doc.createdAt,
    });
  } catch (err) {
    console.error("❌ /api/predict error:", err.message);
    if (err.response) console.error("Flask error:", err.response.data);
    res.status(500).json({ error: err.response?.data?.error || err.message });
  }
});

app.get("/api/history", async (req, res) => {
  try {
    const records = await Prediction.find().sort({ createdAt: -1 }).limit(50).lean();
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/map-data", async (req, res) => {
  try {
    const flaskRes = await axios.get(`${FLASK_URL}/map-data`);
    res.json(flaskRes.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/history/:id", async (req, res) => {
  try {
    await Prediction.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// FEATURE 2 — Fish Species Identification
// ════════════════════════════════════════════════════════════════════════════

app.post("/api/identify-species", upload.single("image"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: "No image uploaded. Use field name: 'image'" });

    console.log("📷 Image received:", req.file.originalname, `(${(req.file.size / 1024).toFixed(1)} KB)`);

    const form = new FormData();
    form.append("image", req.file.buffer, {
      filename:    req.file.originalname,
      contentType: req.file.mimetype,
    });

    const flaskRes = await axios.post(`${FLASK_URL}/predict-species`, form, {
      headers: { ...form.getHeaders() },
      maxContentLength: Infinity,
      maxBodyLength:    Infinity,
    });
    const result = flaskRes.data;
    console.log("📨 Flask species:", result.common_name, `${result.confidence}%`);

    const thumbnailPrefix = `data:${req.file.mimetype};base64,`
      + req.file.buffer.toString("base64").substring(0, 200);

    const doc = await SpeciesResult.create({
      image_url:       thumbnailPrefix,
      species_key:     result.species_key,
      common_name:     result.common_name,
      scientific_name: result.scientific_name,
      confidence:      result.confidence,
      description:     result.description,
      conservation:    result.conservation,
      habitat:         result.habitat,
      top3:            result.top3 || [],
      latitude:  req.body.latitude  ? Number(req.body.latitude)  : null,
      longitude: req.body.longitude ? Number(req.body.longitude) : null,
    });
    console.log("✅ Saved species result:", doc._id, "|", doc.common_name);

    res.json({ ...result, _id: doc._id, createdAt: doc.createdAt });
  } catch (err) {
    console.error("❌ /api/identify-species error:", err.message);
    if (err.response) console.error("Flask error:", err.response.data);
    res.status(500).json({ error: err.response?.data?.error || err.message });
  }
});

app.get("/api/species-history", async (req, res) => {
  try {
    const records = await SpeciesResult.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .select("-image_url")
      .lean();
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/species-history/:id", async (req, res) => {
  try {
    await SpeciesResult.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// FEATURE 3 — Marine Ecosystem Health
// ════════════════════════════════════════════════════════════════════════════

/** POST /api/ecosystem-health
 *  Forward params to Flask → save result to MongoDB → return response
 */
app.post("/api/ecosystem-health", async (req, res) => {
  try {
    console.log("🌊 Ecosystem health request:", req.body);

    const required = [
      "temperature","salinity","dissolved_o2","chlorophyll",
      "ph","nitrate","fish_index","biodiversity",
    ];
    const missing = required.filter(k => req.body[k] == null);
    if (missing.length)
      return res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` });

    // Build params object
    const params = {};
    required.forEach(k => { params[k] = Number(req.body[k]); });

    // Call Flask
    console.log("📤 Sending to Flask /ecosystem-health...");
    const flaskRes = await axios.post(`${FLASK_URL}/ecosystem-health`, {
      ...params,
      latitude:  req.body.latitude  || null,
      longitude: req.body.longitude || null,
    });
    const result = flaskRes.data;
    console.log("📨 Flask ecosystem result:", result.category, result.health_score);

    // Save to MongoDB
    const doc = await EcosystemHealth.create({
      parameters:        params,
      health_score:      result.health_score,
      category:          result.category,
      method:            result.method,
      ml_confidence:     result.ml_confidence,
      parameter_impacts: result.parameter_impacts,
      recommendations:   result.recommendations,
      latitude:          req.body.latitude  ? Number(req.body.latitude)  : null,
      longitude:         req.body.longitude ? Number(req.body.longitude) : null,
      zone_name:         req.body.zone_name || null,
    });
    console.log("✅ Saved ecosystem health:", doc._id, "| Score:", doc.health_score);

    res.json({ ...result, _id: doc._id, createdAt: doc.createdAt });
  } catch (err) {
    console.error("❌ /api/ecosystem-health error:", err.message);
    if (err.response) console.error("Flask error:", err.response.data);
    res.status(500).json({ error: err.response?.data?.error || err.message });
  }
});

/** GET /api/ecosystem-history — last 50 ecosystem assessments */
app.get("/api/ecosystem-history", async (req, res) => {
  try {
    const records = await EcosystemHealth.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/ecosystem-zones — records with lat/lng for Leaflet map */
app.get("/api/ecosystem-zones", async (req, res) => {
  try {
    const zones = await EcosystemHealth.find({
      latitude:  { $ne: null },
      longitude: { $ne: null },
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .select("health_score category latitude longitude zone_name createdAt")
      .lean();
    res.json(zones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/ecosystem-history/:id */
app.delete("/api/ecosystem-history/:id", async (req, res) => {
  try {
    await EcosystemHealth.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_, res) =>
  res.json({
    status: "ok",
    features: {
      abundance_prediction:   "active",
      species_identification: "active",
      ecosystem_health:       "active",   // ← Feature 3
    },
  })
);

// ── Multer error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError)
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  if (err)
    return res.status(400).json({ error: err.message });
  next();
});

app.listen(PORT, () => console.log(`🚀 Express running on port ${PORT}`));