const mongoose = require("mongoose");

const ecosystemSchema = new mongoose.Schema(
  {
    parameters: {
      temperature:  { type: Number, required: true },
      salinity:     { type: Number, required: true },
      dissolved_o2: { type: Number, required: true },
      chlorophyll:  { type: Number, required: true },
      ph:           { type: Number, required: true },
      nitrate:      { type: Number, required: true },
      fish_index:   { type: Number, required: true },
      biodiversity: { type: Number, required: true },
      _id: false,
    },
    health_score:      { type: Number, required: true },   // 0–100
    category:          { type: String, enum: ["Critical","Moderate","Healthy"] },
    method:            { type: String },                   // ML / Rule-based
    ml_confidence:     { type: Number, default: 0 },
    parameter_impacts: { type: mongoose.Schema.Types.Mixed },
    recommendations:   [{ type: String }],
    latitude:          { type: Number, default: null },
    longitude:         { type: Number, default: null },
    zone_name:         { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EcosystemHealth", ecosystemSchema);