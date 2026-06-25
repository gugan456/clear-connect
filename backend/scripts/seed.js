require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Collector = require('../models/Collector');

const collectors = [
  {
    name: 'Green Earth Recycling',
    materials: ['plastic', 'paper'],
    contact: '+91 98765 43210',
    area: 'South Zone',
  },
  {
    name: 'Metal & More',
    materials: ['metal'],
    contact: '+91 91234 56789',
    area: 'North Zone',
  },
  {
    name: 'Eco Glass Collectors',
    materials: ['glass'],
    contact: '+91 99887 77665',
    area: 'East Zone',
  },
  {
    name: 'E-Waste Hub',
    materials: ['ewaste'],
    contact: '+91 90909 80808',
    area: 'West Zone',
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing collectors and re-insert
    await Collector.deleteMany({});
    const inserted = await Collector.insertMany(collectors);
    console.log(`🌱 Seeded ${inserted.length} collectors successfully`);

    await mongoose.disconnect();
    console.log('🔌 Disconnected');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
