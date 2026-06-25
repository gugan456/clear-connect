const Collector = require('../models/Collector');

// Get all active collectors
const getCollectors = async (req, res, next) => {
  try {
    const collectors = await Collector.find({ active: true })
      .select('name materials contact area')
      .lean();
    res.json(collectors);
  } catch (err) {
    next(err);
  }
};

module.exports = { getCollectors };
