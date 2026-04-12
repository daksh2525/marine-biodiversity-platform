// ── models/Prediction.js ──────────────────────────────────────────────────────
const mongoose = require("mongoose");

const predictionSchema = new mongoose.Schema(
  {
    input: {
      type: {
        temperature: { type: Number, required: true },
        salinity:    { type: Number, required: true },
        oxygen:      { type: Number, required: true },
        chlorophyll: { type: Number, required: true },
        month:       { type: Number, required: true },
        depth:       { type: Number, required: true },
      },
      required: true,
      _id: false,   // don't create sub-document _id for input
    },
    fish_abundance:  { type: Number, required: true },
    rf_prediction:   { type: Number, default: 0 },
    xgb_prediction:  { type: Number, default: 0 },
    category:        { type: String, enum: ["High", "Medium", "Low"], default: "Low" },
    latitude:        { type: Number, default: null },
    longitude:       { type: Number, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Prediction", predictionSchema);

