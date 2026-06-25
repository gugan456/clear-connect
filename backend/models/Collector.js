const mongoose = require('mongoose');

const collectorSchema = new mongoose.Schema(
  {
    name:      { type: String, required: true, trim: true },
    materials: { type: [String], required: true },  // e.g. ['plastic', 'paper']
    contact:   { type: String, required: true, trim: true },
    area:      { type: String, default: '', trim: true },
    active:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Index for fast filtering by material type
collectorSchema.index({ materials: 1 });

module.exports = mongoose.model('Collector', collectorSchema);
