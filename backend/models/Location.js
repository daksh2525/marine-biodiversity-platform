const mongoose = require("mongoose");
// ── models/Location.js ────────────────────────────────────────────────────────
const locationSchema = new mongoose.Schema(
  {
    name:           { type: String, required: true },   // e.g. "Arabian Sea Zone A"
    latitude:       { type: Number, required: true },
    longitude:      { type: Number, required: true },
    zone:           { type: String },                   // e.g. "EEZ", "Coastal"
    avg_abundance:  { type: Number },
    notes:          { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Location", locationSchema);