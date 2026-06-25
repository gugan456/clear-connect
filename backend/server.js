require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const path       = require('path');

const { connectDB } = require('./config/db');
const apiRoutes     = require('./routes/apiRoutes');

const app  = express();
const PORT = process.env.PORT || 5000;
const ENV  = process.env.NODE_ENV || 'development';

// ===== Security Headers =====
app.use(helmet({
  contentSecurityPolicy: false, // allow inline scripts in the served frontend
}));

// ===== CORS =====
const allowedOrigin = process.env.ALLOWED_ORIGIN || `http://localhost:${PORT}`;
app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST', 'PUT'],
  credentials: true,
}));

// ===== Request Logging =====
app.use(morgan(ENV === 'production' ? 'combined' : 'dev'));

// ===== Body Parsing (built-in Express — no body-parser needed) =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== Rate Limiting on all API routes =====
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' },
});
app.use('/api', apiLimiter);

// ===== Database Connection =====
connectDB();

// ===== API Routes =====
app.use('/api', apiRoutes);

// ===== Serve Frontend =====
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

app.get('/',                (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));
app.get('/profile.html',    (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));
app.get('/calculator.html', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));

// ===== 404 for Unknown API Routes =====
app.use('/api', (req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
});

// ===== Global Error Handler =====
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);
  if (ENV !== 'production') console.error(err.stack);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(422).json({ message: 'Validation failed', errors: messages });
  }
  // Mongoose duplicate key error (e.g. duplicate email)
  if (err.code === 11000) {
    return res.status(409).json({ message: 'Duplicate entry', field: Object.keys(err.keyValue)[0] });
  }

  res.status(500).json({ message: 'Internal server error' });
});

// ===== Start Server =====
app.listen(PORT, () => {
  console.log(`🚀 Server [${ENV}] running at http://localhost:${PORT}`);
});
