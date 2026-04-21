
// ── server/models/OtolithResult.js ───────────────────────────────────────────
const mongoose = require("mongoose");

const otolithSchema = new mongoose.Schema(
  {
    image_url:     { type: String, default: null },   // base64 thumbnail prefix
    age_years:     { type: Number, required: true },
    ring_count:    { type: Number, required: true },
    growth_rate:   { type: String, enum: ["Fast","Normal","Slow","Unknown"] },
    growth_desc:   { type: String },
    stock_id:      { type: String, enum: ["A","B","C","stock_A","stock_B","stock_C"] },
    confidence:    { type: Number },
    ring_spacings: [{ type: Number }],
    species:       { type: String, default: null },
    latitude:      { type: Number, default: null },
    longitude:     { type: Number, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("OtolithResult", otolithSchema);
