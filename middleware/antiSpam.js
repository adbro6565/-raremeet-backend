const WINDOW_MS = 3 * 1000; // 3 seconds
const MAX_REQUESTS = 5;

const requestHistory = new Map();

const antiSpamMiddleware = (req, res, next) => {
  try {
    const key =
      req.userId ||
      req.ip ||
      req.headers['x-forwarded-for'] ||
      req.connection?.remoteAddress ||
      'anonymous';

    const now = Date.now();
    const recentEvents = (requestHistory.get(key) || []).filter(
      (timestamp) => now - timestamp < WINDOW_MS
    );

    if (recentEvents.length >= MAX_REQUESTS) {
      return res.status(429).json({
        error: 'Too many actions back-to-back. Please slow down.',
      });
    }

    recentEvents.push(now);
    requestHistory.set(key, recentEvents);
    next();
  } catch (error) {
    console.warn('antiSpam middleware error:', error);
    next();
  }
};

module.exports = { antiSpamMiddleware };


