const User = require('../models/User');

// Update profile details (authenticated user)
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const email = req.user.email;

    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      { $set: { name, phone } },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// Get user profile by email (restricted to the authenticated user)
const getProfile = async (req, res, next) => {
  try {
    const paramEmail = req.params.email.toLowerCase().trim();
    const tokenEmail = req.user.email.toLowerCase().trim();

    // Prevent cross-user data exposure
    if (paramEmail !== tokenEmail) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only view your own profile.' });
    }

    const user = await User.findOne({ email: tokenEmail }).select('-password').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    res.json(user);
  } catch (err) {
    next(err);
  }
};

module.exports = { updateProfile, getProfile };
