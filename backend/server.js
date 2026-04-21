// server.js — Express + MongoDB backend — Marine Intelligence Platform (CMLRE)
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
const EcosystemHealth = require("./models/EcosystemHealth");
const OtolithResult   = require("./models/OtolithResult");   // ← Feature 4
const EdnaResult      = require("./models/EdnaResult");      // ← Feature 5

const app       = express();
const PORT      = process.env.PORT || 5002;
const FLASK_URL = process.env.FLASK_URL || "http://localhost:5001";

app.use(cors());
app.use(express.json());

// ── Multer — memory storage, supports images up to 15MB ──────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 15 * 1024 * 1024 },   // 15 MB (otolith images can be larger)
  fileFilter: (_, file, cb) => {
    const allowed = ["image/jpeg","image/png","image/webp","image/bmp","image/tiff"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPG, PNG, WEBP, BMP, TIFF allowed"), false);
  },
});

// ── MongoDB ───────────────────────────────────────────────────────────────────
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
      temperature: Number(temperature), salinity:    Number(salinity),
      oxygen:      Number(oxygen),      chlorophyll: Number(chlorophyll),
      month:       Number(month),       depth:       Number(depth),
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
      rf_prediction:  ml.rf_prediction,
      xgb_prediction: ml.xgb_prediction,
      category:       ml.category,
      color:          ml.color,
      input:          inputData,
      _id:            doc._id,
      createdAt:      doc.createdAt,
    });
  } catch (err) {
    console.error("❌ /api/predict error:", err.message);
    if (err.response) console.error("Flask error:", err.response.data);
    res.status(500).json({ error: err.response?.data?.error || err.message });
  }
});

app.get("/api/history", async (req, res) => {
  try {
    res.json(await Prediction.find().sort({ createdAt: -1 }).limit(50).lean());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/map-data", async (req, res) => {
  try {
    const flaskRes = await axios.get(`${FLASK_URL}/map-data`);
    res.json(flaskRes.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/history/:id", async (req, res) => {
  try {
    await Prediction.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// FEATURE 2 — Fish Species Identification
// ════════════════════════════════════════════════════════════════════════════

app.post("/api/identify-species", upload.single("image"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: "No image uploaded. Use field: 'image'" });

    console.log("📷 Species image:", req.file.originalname,
                `(${(req.file.size / 1024).toFixed(1)} KB)`);

    const form = new FormData();
    form.append("image", req.file.buffer, {
      filename: req.file.originalname, contentType: req.file.mimetype,
    });

    const flaskRes = await axios.post(`${FLASK_URL}/predict-species`, form, {
      headers: { ...form.getHeaders() },
      maxContentLength: Infinity, maxBodyLength: Infinity,
    });
    const result = flaskRes.data;
    console.log("📨 Flask species:", result.common_name, `${result.confidence}%`);

    const thumbPrefix = `data:${req.file.mimetype};base64,`
      + req.file.buffer.toString("base64").substring(0, 200);

    const doc = await SpeciesResult.create({
      image_url:       thumbPrefix,
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
    res.json(await SpeciesResult.find().sort({ createdAt: -1 }).limit(50).select("-image_url").lean());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/species-history/:id", async (req, res) => {
  try {
    await SpeciesResult.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// FEATURE 3 — Marine Ecosystem Health
// ════════════════════════════════════════════════════════════════════════════

app.post("/api/ecosystem-health", async (req, res) => {
  try {
    console.log("🌊 Ecosystem health request:", req.body);
    const required = ["temperature","salinity","dissolved_o2","chlorophyll",
                      "ph","nitrate","fish_index","biodiversity"];
    const missing  = required.filter(k => req.body[k] == null);
    if (missing.length)
      return res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` });

    const params = {};
    required.forEach(k => { params[k] = Number(req.body[k]); });

    const flaskRes = await axios.post(`${FLASK_URL}/ecosystem-health`, {
      ...params,
      latitude:  req.body.latitude  || null,
      longitude: req.body.longitude || null,
    });
    const result = flaskRes.data;
    console.log("📨 Flask ecosystem:", result.category, result.health_score);

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

app.get("/api/ecosystem-history", async (req, res) => {
  try {
    res.json(await EcosystemHealth.find().sort({ createdAt: -1 }).limit(50).lean());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/ecosystem-zones", async (req, res) => {
  try {
    const zones = await EcosystemHealth.find({ latitude: { $ne: null }, longitude: { $ne: null } })
      .sort({ createdAt: -1 }).limit(200)
      .select("health_score category latitude longitude zone_name createdAt").lean();
    res.json(zones);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/ecosystem-history/:id", async (req, res) => {
  try {
    await EcosystemHealth.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// FEATURE 4 — Otolith Image Analysis
// ════════════════════════════════════════════════════════════════════════════

app.post("/api/analyze-otolith", upload.single("image"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: "No image. Use field: 'image'" });

    console.log("🦴 Otolith image:", req.file.originalname,
                `(${(req.file.size / 1024).toFixed(1)} KB)`);

    const form = new FormData();
    form.append("image", req.file.buffer, {
      filename: req.file.originalname, contentType: req.file.mimetype,
    });

    const flaskRes = await axios.post(`${FLASK_URL}/analyze-otolith`, form, {
      headers: { ...form.getHeaders() },
      maxContentLength: Infinity, maxBodyLength: Infinity,
    });
    const result = flaskRes.data;
    console.log("📨 Otolith result: age=", result.age_years,
                "rings=", result.ring_count, "stock=", result.stock_id);

    const thumbPrefix = result.original_image
      ? `data:image/png;base64,${result.original_image.substring(0, 200)}`
      : null;

    const doc = await OtolithResult.create({
      image_url:     thumbPrefix,
      age_years:     result.age_years,
      ring_count:    result.ring_count,
      growth_rate:   result.growth_rate,
      growth_desc:   result.growth_desc,
      stock_id:      result.stock_id,
      confidence:    result.confidence,
      ring_spacings: result.ring_spacings || [],
      species:       req.body.species   || null,
      latitude:      req.body.latitude  ? Number(req.body.latitude)  : null,
      longitude:     req.body.longitude ? Number(req.body.longitude) : null,
    });
    console.log("✅ Saved otolith result:", doc._id);

    res.json({ ...result, _id: doc._id, createdAt: doc.createdAt });
  } catch (err) {
    console.error("❌ /api/analyze-otolith error:", err.message);
    if (err.response) console.error("Flask error:", err.response.data);
    res.status(500).json({ error: err.response?.data?.error || err.message });
  }
});

app.get("/api/otolith-history", async (req, res) => {
  try {
    res.json(await OtolithResult.find().sort({ createdAt: -1 }).limit(50).select("-image_url").lean());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/otolith-history/:id", async (req, res) => {
  try {
    await OtolithResult.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// FEATURE 5 — eDNA Species Matching
// ════════════════════════════════════════════════════════════════════════════

app.post("/api/match-edna", async (req, res) => {
  try {
    const { dna_sequence, latitude, longitude } = req.body;
    if (!dna_sequence?.trim())
      return res.status(400).json({ error: "Missing dna_sequence" });

    console.log("🧬 eDNA request, length:", dna_sequence.length);

    const flaskRes = await axios.post(
      `${FLASK_URL}/match-edna`,
      { dna_sequence: dna_sequence.trim() },
      { timeout: 35000 }   // 35s — NCBI BLAST can be slow
    );
    const result = flaskRes.data;
    console.log("📨 eDNA result:", result.species_name,
                `${result.match_percentage}%`, `[${result.method_used}]`);

    const doc = await EdnaResult.create({
      dna_sequence:        dna_sequence.trim().substring(0, 500),
      species_name:        result.species_name,
      scientific_name:     result.scientific_name,
      match_percentage:    result.match_percentage,
      e_value:             result.e_value       ?? null,
      method_used:         result.method_used,
      description:         result.description,
      conservation_status: result.conservation_status,
      found_locations:     result.found_locations  || [],
      sequence_stats:      result.sequence_stats   || {},
      latitude:  latitude  ? Number(latitude)  : null,
      longitude: longitude ? Number(longitude) : null,
    });
    console.log("✅ Saved eDNA result:", doc._id);

    res.json({ ...result, _id: doc._id, createdAt: doc.createdAt });
  } catch (err) {
    console.error("❌ /api/match-edna error:", err.message);
    if (err.response) console.error("Flask error:", err.response.data);
    res.status(500).json({ error: err.response?.data?.error || err.message });
  }
});

app.get("/api/edna-history", async (req, res) => {
  try {
    res.json(await EdnaResult.find().sort({ createdAt: -1 }).limit(50).select("-dna_sequence").lean());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/edna-zones", async (req, res) => {
  try {
    const zones = await EdnaResult.find({ latitude: { $ne: null }, longitude: { $ne: null } })
      .sort({ createdAt: -1 }).limit(100)
      .select("species_name scientific_name match_percentage latitude longitude createdAt").lean();
    res.json(zones);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/edna-history/:id", async (req, res) => {
  try {
    await EdnaResult.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_, res) =>
  res.json({
    status: "ok",
    features: {
      abundance_prediction:   "active",
      species_identification: "active",
      ecosystem_health:       "active",
      otolith_analysis:       "active",   // ← Feature 4
      edna_matching:          "active",   // ← Feature 5
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