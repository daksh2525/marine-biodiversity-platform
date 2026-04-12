// server.js — Express + MongoDB backend
// Run: node server.js

require("dotenv").config();
const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");
const axios    = require("axios");

const Prediction = require("./models/Prediction");
const Location   = require("./models/Location");

const app  = express();
const PORT = process.env.PORT || 5000;
const FLASK_URL = process.env.FLASK_URL || "http://localhost:5001";

app.use(cors());
app.use(express.json());

// ── MongoDB connection ────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/fishdb")
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

// ── Routes ────────────────────────────────────────────────────────────────────

/** POST /api/predict
 *  Forward to Flask, save to MongoDB, return combined response.
 */
app.post("/api/predict", async (req, res) => {
  try {
    console.log("📥 req.body:", req.body); // debug

    const { temperature, salinity, oxygen, chlorophyll, month, depth, latitude, longitude } = req.body;

    // 1. Validate
    const fields = { temperature, salinity, oxygen, chlorophyll, month, depth };
    const missing = Object.keys(fields).filter((k) => fields[k] === undefined || fields[k] === null);
    if (missing.length) return res.status(400).json({ error: `Missing: ${missing.join(", ")}` });

    // 2. Build input
    const inputData = {
      temperature: Number(temperature),
      salinity:    Number(salinity),
      oxygen:      Number(oxygen),
      chlorophyll: Number(chlorophyll),
      month:       Number(month),
      depth:       Number(depth),
    };

    // 3. Call Flask
    console.log("📤 Sending to Flask:", inputData);
    const flaskRes = await axios.post(`${FLASK_URL}/predict`, inputData);
    const ml = flaskRes.data;
    console.log("📨 Flask response:", ml);

    // 4. Save to MongoDB
    const doc = await Prediction.create({
      input:          inputData,
      fish_abundance: ml.fish_abundance_kg_km2,
      rf_prediction:  ml.rf_prediction,
      xgb_prediction: ml.xgb_prediction,
      category:       ml.category,
      latitude:       Number(latitude)  || null,
      longitude:      Number(longitude) || null,
    });
    console.log("✅ Saved to MongoDB:", doc._id, "abundance:", doc.fish_abundance);

    // 5. Respond
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

/** GET /api/history
 *  Return last 50 predictions.
 */
app.get("/api/history", async (req, res) => {
  try {
    const records = await Prediction.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/map-data
 *  Proxy the Flask /map-data endpoint.
 */
app.get("/api/map-data", async (req, res) => {
  try {
    const flaskRes = await axios.get(`${FLASK_URL}/map-data`);
    res.json(flaskRes.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/history/:id */
app.delete("/api/history/:id", async (req, res) => {
  try {
    await Prediction.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_, res) => res.json({ status: "ok" }));

app.listen(PORT, () => console.log(`🚀 Express running on port ${PORT}`));