const { body, validationResult } = require('express-validator');

// Helper to format validation errors and abort request if invalid
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMsgs = errors.array().map(err => err.msg);
    return res.status(422).json({ success: false, message: errorMsgs[0], errors: errorMsgs });
  }
  next();
};

const registerValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Must be a valid email address'),
  body('phone').trim().isLength({ min: 10 }).withMessage('Phone number must be at least 10 digits'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  validate
];

const loginValidator = [
  body('email').trim().isEmail().withMessage('Must be a valid email address'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
];

const calculateValidator = [
  body('plastic').optional().isFloat({ min: 0 }).withMessage('Plastic weight must be a positive number'),
  body('paper').optional().isFloat({ min: 0 }).withMessage('Paper weight must be a positive number'),
  body('metal').optional().isFloat({ min: 0 }).withMessage('Metal weight must be a positive number'),
  body('glass').optional().isFloat({ min: 0 }).withMessage('Glass weight must be a positive number'),
  body('ewaste').optional().isFloat({ min: 0 }).withMessage('E-waste weight must be a positive number'),
  validate
];

module.exports = {
  registerValidator,
  loginValidator,
  calculateValidator
};
