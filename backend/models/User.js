const mongoose = require('mongoose');

// Sub-schema for each recycling history entry
const historyItemSchema = new mongoose.Schema({
  materials: {
    plastic: { type: Number, default: 0, min: 0 },
    paper:   { type: Number, default: 0, min: 0 },
    metal:   { type: Number, default: 0, min: 0 },
    glass:   { type: Number, default: 0, min: 0 },
    ewaste:  { type: Number, default: 0, min: 0 },
  },
  totalKg: { type: Number, required: true, min: 0 },
  points:  { type: Number, required: true, min: 0 },
  date:    { type: Date, default: Date.now },
}, { _id: false });

const bcrypt = require('bcryptjs');

// Main user schema
const userSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    email:       { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone:       { type: String, required: true, trim: true },
    password:    { type: String, required: true },
    greenPoints: { type: Number, default: 0, min: 0 },
    history:     { type: [historyItemSchema], default: [] },
  },
  { timestamps: true }  // adds createdAt + updatedAt automatically
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password helper
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
