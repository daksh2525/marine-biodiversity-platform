require("dotenv").config();
const express       = require("express");
const mongoose      = require("mongoose");
const cors          = require("cors");
const axios         = require("axios");
const multer        = require("multer");
const FormData      = require("form-data");
const auth          = require("./middleware/auth");
const allowRoles    = require("./middleware/roleCheck");
const authRoutes    = require("./routes/auth");
const Prediction    = require("./models/Prediction");
const Location      = require("./models/Location");
const SpeciesResult = require("./models/SpeciesResult");
const EcosystemHealth = require("./models/EcosystemHealth");
const OtolithResult = require("./models/OtolithResult");
const EdnaResult    = require("./models/EdnaResult");

const app       = express();
const PORT      = process.env.PORT || 5000;
const FLASK_URL = process.env.FLASK_URL || "http://localhost:5001";

app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = ["image/jpeg","image/png","image/webp","image/bmp","image/tiff"]
      .includes(file.mimetype);
    cb(ok ? null : new Error("Only JPG/PNG/WEBP/BMP/TIFF allowed"), ok);
  },
});

mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/fishdb")
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("MongoDB error:", err));

// ── Auth routes (public) ──────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);

// ════════════════════════════════════════════════════════════════════════════
// FEATURE 1 — Fish Abundance
// ════════════════════════════════════════════════════════════════════════════
app.post("/api/predict", auth, async (req, res) => {
  try {
    const { temperature, salinity, oxygen, chlorophyll, month, depth, latitude, longitude } = req.body;
    const fields  = { temperature, salinity, oxygen, chlorophyll, month, depth };
    const missing = Object.keys(fields).filter(k => fields[k] == null);
    if (missing.length) return res.status(400).json({ error: `Missing: ${missing.join(", ")}` });

    const inputData = {
      temperature: Number(temperature), salinity: Number(salinity),
      oxygen: Number(oxygen),           chlorophyll: Number(chlorophyll),
      month: Number(month),             depth: Number(depth),
    };

    const flaskRes = await axios.post(`${FLASK_URL}/predict`, inputData);
    const ml = flaskRes.data;

    const doc = await Prediction.create({
      input: inputData, fish_abundance: ml.fish_abundance_kg_km2,
      rf_prediction: ml.rf_prediction, xgb_prediction: ml.xgb_prediction,
      category: ml.category,
      latitude: Number(latitude) || null, longitude: Number(longitude) || null,
      createdBy: req.user._id,
    });

    res.json({
      fish_abundance_kg_km2: ml.fish_abundance_kg_km2,
      rf_prediction: ml.rf_prediction, xgb_prediction: ml.xgb_prediction,
      category: ml.category, color: ml.color, input: inputData,
      _id: doc._id, createdAt: doc.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.error || err.message });
  }
});

app.get("/api/history", auth, async (req, res) => {
  try {
    res.json(await Prediction.find().sort({ createdAt: -1 }).limit(50).lean());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/map-data", async (req, res) => {   // public — map loads on login page too
  try {
    const r = await axios.get(`${FLASK_URL}/map-data`);
    res.json(r.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/history/:id", auth, async (req, res) => {
  try {
    await Prediction.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// FEATURE 2 — Species Identification
// ════════════════════════════════════════════════════════════════════════════
app.post("/api/identify-species", auth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });
    const form = new FormData();
    form.append("image", req.file.buffer, { filename: req.file.originalname, contentType: req.file.mimetype });
    const flaskRes = await axios.post(`${FLASK_URL}/predict-species`, form, {
      headers: { ...form.getHeaders() }, maxContentLength: Infinity, maxBodyLength: Infinity,
    });
    const result = flaskRes.data;
    const doc = await SpeciesResult.create({
      image_url: `data:${req.file.mimetype};base64,` + req.file.buffer.toString("base64").substring(0, 200),
      species_key: result.species_key, common_name: result.common_name,
      scientific_name: result.scientific_name, confidence: result.confidence,
      description: result.description, conservation: result.conservation,
      habitat: result.habitat, top3: result.top3 || [],
      latitude: req.body.latitude ? Number(req.body.latitude) : null,
      longitude: req.body.longitude ? Number(req.body.longitude) : null,
      createdBy: req.user._id,
    });
    res.json({ ...result, _id: doc._id, createdAt: doc.createdAt });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.error || err.message });
  }
});

app.get("/api/species-history", auth, async (req, res) => {
  try {
    res.json(await SpeciesResult.find().sort({ createdAt: -1 }).limit(50).select("-image_url").lean());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/species-history/:id", auth, async (req, res) => {
  try {
    await SpeciesResult.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// FEATURE 3 — Ecosystem Health
// ════════════════════════════════════════════════════════════════════════════
app.post("/api/ecosystem-health",
  auth, allowRoles("scientist","policymaker","phd"), async (req, res) => {
  try {
    const required = ["temperature","salinity","dissolved_o2","chlorophyll",
                      "ph","nitrate","fish_index","biodiversity"];
    const missing = required.filter(k => req.body[k] == null);
    if (missing.length) return res.status(400).json({ error: `Missing: ${missing.join(", ")}` });

    const params = {};
    required.forEach(k => { params[k] = Number(req.body[k]); });

    const flaskRes = await axios.post(`${FLASK_URL}/ecosystem-health`, {
      ...params, latitude: req.body.latitude || null, longitude: req.body.longitude || null,
    });
    const result = flaskRes.data;
    const doc = await EcosystemHealth.create({
      parameters: params, health_score: result.health_score, category: result.category,
      method: result.method, ml_confidence: result.ml_confidence,
      parameter_impacts: result.parameter_impacts, recommendations: result.recommendations,
      latitude: req.body.latitude ? Number(req.body.latitude) : null,
      longitude: req.body.longitude ? Number(req.body.longitude) : null,
      zone_name: req.body.zone_name || null, createdBy: req.user._id,
    });
    res.json({ ...result, _id: doc._id, createdAt: doc.createdAt });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.error || err.message });
  }
});

app.get("/api/ecosystem-history", auth, async (req, res) => {
  try {
    res.json(await EcosystemHealth.find().sort({ createdAt: -1 }).limit(50).lean());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/ecosystem-zones", async (req, res) => {   // public for map
  try {
    const zones = await EcosystemHealth
      .find({ latitude: { $ne: null }, longitude: { $ne: null } })
      .sort({ createdAt: -1 }).limit(200)
      .select("health_score category latitude longitude zone_name createdAt").lean();
    res.json(zones);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/ecosystem-history/:id", auth, async (req, res) => {
  try {
    await EcosystemHealth.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// FEATURE 4 — Otolith Analysis
// ════════════════════════════════════════════════════════════════════════════
app.post("/api/analyze-otolith",
  auth, allowRoles("scientist","phd"), upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });
    const form = new FormData();
    form.append("image", req.file.buffer, { filename: req.file.originalname, contentType: req.file.mimetype });
    const flaskRes = await axios.post(`${FLASK_URL}/analyze-otolith`, form, {
      headers: { ...form.getHeaders() }, maxContentLength: Infinity, maxBodyLength: Infinity,
    });
    const result = flaskRes.data;
    const doc = await OtolithResult.create({
      image_url: result.original_image ? `data:image/png;base64,${result.original_image.substring(0, 200)}` : null,
      age_years: result.age_years, ring_count: result.ring_count,
      growth_rate: result.growth_rate, growth_desc: result.growth_desc,
      stock_id: result.stock_id, confidence: result.confidence,
      ring_spacings: result.ring_spacings || [],
      latitude: req.body.latitude ? Number(req.body.latitude) : null,
      longitude: req.body.longitude ? Number(req.body.longitude) : null,
      createdBy: req.user._id,
    });
    res.json({ ...result, _id: doc._id, createdAt: doc.createdAt });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.error || err.message });
  }
});

app.get("/api/otolith-history", auth, allowRoles("scientist","phd"), async (req, res) => {
  try {
    res.json(await OtolithResult.find().sort({ createdAt: -1 }).limit(50).select("-image_url").lean());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/otolith-history/:id", auth, allowRoles("scientist","phd"), async (req, res) => {
  try {
    await OtolithResult.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// FEATURE 5 — eDNA Matching
// ════════════════════════════════════════════════════════════════════════════
app.post("/api/match-edna", auth, allowRoles("scientist","phd"), async (req, res) => {
  try {
    const { dna_sequence, latitude, longitude } = req.body;
    if (!dna_sequence?.trim()) return res.status(400).json({ error: "Missing dna_sequence" });

    const flaskRes = await axios.post(`${FLASK_URL}/match-edna`,
      { dna_sequence: dna_sequence.trim() }, { timeout: 35000 });
    const result = flaskRes.data;

    const doc = await EdnaResult.create({
      dna_sequence: dna_sequence.trim().substring(0, 500),
      species_name: result.species_name, scientific_name: result.scientific_name,
      match_percentage: result.match_percentage, e_value: result.e_value ?? null,
      method_used: result.method_used, description: result.description,
      conservation_status: result.conservation_status,
      found_locations: result.found_locations || [],
      sequence_stats: result.sequence_stats || {},
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      createdBy: req.user._id,
    });
    res.json({ ...result, _id: doc._id, createdAt: doc.createdAt });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.error || err.message });
  }
});

app.get("/api/edna-history", auth, allowRoles("scientist","phd"), async (req, res) => {
  try {
    res.json(await EdnaResult.find().sort({ createdAt: -1 }).limit(50).select("-dna_sequence").lean());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/edna-zones", async (req, res) => {   // public for map
  try {
    const zones = await EdnaResult
      .find({ latitude: { $ne: null }, longitude: { $ne: null } })
      .sort({ createdAt: -1 }).limit(100)
      .select("species_name scientific_name match_percentage latitude longitude createdAt").lean();
    res.json(zones);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/edna-history/:id", auth, allowRoles("scientist","phd"), async (req, res) => {
  try {
    await EdnaResult.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Health + Unified history ──────────────────────────────────────────────────
app.get("/api/health", (_, res) => res.json({ status: "ok",
  features: ["abundance","species","ecosystem","otolith","edna"] }));

// Unified history for all features
app.get("/api/all-history", auth, async (req, res) => {
  try {
    const [predictions, species, ecosystem, otolith, edna] = await Promise.all([
      Prediction.find().sort({ createdAt: -1 }).limit(20).lean(),
      SpeciesResult.find().sort({ createdAt: -1 }).limit(20).select("-image_url").lean(),
      EcosystemHealth.find().sort({ createdAt: -1 }).limit(20).lean(),
      OtolithResult.find().sort({ createdAt: -1 }).limit(20).select("-image_url").lean(),
      EdnaResult.find().sort({ createdAt: -1 }).limit(20).select("-dna_sequence").lean(),
    ]);
    res.json({ predictions, species, ecosystem, otolith, edna });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError)
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  if (err) return res.status(400).json({ error: err.message });
  next();
});

app.listen(PORT, () => console.log(`🚀 Express running on port ${PORT}`));