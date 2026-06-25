const express = require('express');
const router = express.Router();

const { updateProfile, getProfile } = require('../controllers/userController');
const { calculatePoints }         = require('../controllers/calculatorController');
const { getCollectors }           = require('../controllers/collectorController');
const { register, login }          = require('../controllers/authController');

const authMiddleware = require('../middleware/auth');
const { registerValidator, loginValidator, calculateValidator } = require('../middleware/validators');

// ── Auth routes ───────────────────────────────
router.post('/auth/register',  registerValidator, register);
router.post('/auth/login',     loginValidator, login);

// ── User profile ──────────────────────────────
router.put('/profile',         authMiddleware, updateProfile); // Edit profile details
router.get('/profile/:email',  authMiddleware, getProfile);    // Get profile details (checked against JWT)

// ── Green Points calculator ───────────────────
router.post('/calculate',      authMiddleware, calculateValidator, calculatePoints);

// ── Collectors directory ──────────────────────
router.get('/collectors',      getCollectors); // Public collectors fetch

module.exports = router;
