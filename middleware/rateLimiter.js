const rateLimit = require('express-rate-limit');

const isProduction = process.env.NODE_ENV === 'production';

const buildHandler = (message) => (req, res, next, options) => {
  res.status(options.statusCode).json({
    error: message,
    retryAfterSeconds: Math.ceil(options.windowMs / 1000),
  });
};

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 100 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.',
  handler: buildHandler('Too many requests from this IP, please try again later.'),
});

// Strict rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: isProduction ? 15 * 60 * 1000 : 60 * 1000,
  max: isProduction ? 5 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: isProduction
    ? 'Too many login attempts, please try again later.'
    : 'Too many login attempts. Please wait a moment and try again.',
  handler: buildHandler(
    isProduction
      ? 'Too many login attempts, please try again later.'
      : 'Too many login attempts. Please wait a moment and try again.'
  ),
});

// OTP rate limiter
const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Please wait before requesting another OTP.',
  handler: buildHandler('Please wait before requesting another OTP.'),
});

// Swipe rate limiter
const swipeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many swipes, please slow down.',
  handler: buildHandler('Too many swipes, please slow down.'),
});

module.exports = {
  apiLimiter,
  authLimiter,
  otpLimiter,
  swipeLimiter,
};
