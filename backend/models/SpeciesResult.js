const mongoose = require("mongoose");

const speciesResultSchema = new mongoose.Schema(
  {
    image_url:       { type: String, default: null },    // base64 thumbnail or file path
    species_key:     { type: String, required: true },   // e.g. "indian_mackerel"
    common_name:     { type: String, required: true },
    scientific_name: { type: String, required: true },
    confidence:      { type: Number, required: true },   // 0–100
    description:     { type: String },
    conservation:    { type: String },
    habitat:         { type: String },
    top3: [
      {
        rank:        Number,
        species:     String,
        common_name: String,
        confidence:  Number,
        _id:         false,
      },
    ],
    latitude:  { type: Number, default: null },
    longitude: { type: Number, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SpeciesResult", speciesResultSchema);