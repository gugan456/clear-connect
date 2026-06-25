const User = require('../models/User');

// Green Points rate config (easy to update in one place)
const POINTS_RATES = {
  plastic: { perKg: 1,  pointsPer: 10 },  // 1 kg = 10 pts
  paper:   { perKg: 1,  pointsPer: 10 },  // 1 kg = 10 pts
  metal:   { perKg: 5,  pointsPer: 10 },  // 5 kg = 10 pts
  glass:   { perKg: 5,  pointsPer: 10 },  // 5 kg = 10 pts
  ewaste:  { perKg: 10, pointsPer: 10 },  // 10 kg = 10 pts
};

function calcPoints(materials) {
  let total = 0;
  for (const [key, rate] of Object.entries(POINTS_RATES)) {
    total += Math.floor((materials[key] || 0) / rate.perKg) * rate.pointsPer;
  }
  return total;
}

const calculatePoints = async (req, res, next) => {
  try {
    const { plastic = 0, paper = 0, metal = 0, glass = 0, ewaste = 0 } = req.body;
    const email = req.user.email;

    // Clamp all values to non-negative numbers
    const materials = {
      plastic: Math.max(0, Number(plastic) || 0),
      paper:   Math.max(0, Number(paper)   || 0),
      metal:   Math.max(0, Number(metal)   || 0),
      glass:   Math.max(0, Number(glass)   || 0),
      ewaste:  Math.max(0, Number(ewaste)  || 0),
    };

    const points  = calcPoints(materials);
    const totalKg = Object.values(materials).reduce((sum, v) => sum + v, 0);

    // Build history entry with full material breakdown (no more "Mixed")
    const historyItem = {
      materials,
      totalKg,
      points,
      date: new Date(),
    };

    // Single DB call — findOneAndUpdate returns the updated doc directly
    const updatedUser = await User.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      {
        $inc:  { greenPoints: points },
        $push: { history: historyItem },
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) return res.status(404).json({ message: 'User not found' });

    res.json({ success: true, totalPoints: updatedUser.greenPoints, earned: points });
  } catch (err) {
    next(err);
  }
};

module.exports = { calculatePoints };
