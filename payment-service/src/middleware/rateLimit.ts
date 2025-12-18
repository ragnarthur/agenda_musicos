import rateLimit from 'express-rate-limit';

// Rate limit for checkout creation
export const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: {
    error: 'Too many checkout attempts. Please try again later.',
    code: 'rate_limit_exceeded',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit for subscription management
export const subscriptionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: {
    error: 'Too many requests. Please try again later.',
    code: 'rate_limit_exceeded',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limit
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    error: 'Too many requests. Please try again later.',
    code: 'rate_limit_exceeded',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
