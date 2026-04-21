// ── server/models/EdnaResult.js ───────────────────────────────────────────────
const mongoose = require("mongoose");
const ednaSchema = new mongoose.Schema(
  {
    dna_sequence:       { type: String, required: true },
    species_name:       { type: String, required: true },
    scientific_name:    { type: String },
    match_percentage:   { type: Number, required: true },
    e_value:            { type: Number, default: null },
    method_used:        { type: String, enum: ["NCBI","Local"] },
    description:        { type: String },
    conservation_status:{ type: String },
    found_locations:    [[{ type: Number }]],          // [[lat,lng], ...]
    sequence_stats: {
      length:     Number,
      gc_content: Number,
      at_content: Number,
      n_content:  Number,
      quality:    String,
      _id: false,
    },
    latitude:  { type: Number, default: null },
    longitude: { type: Number, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EdnaResult", ednaSchema);