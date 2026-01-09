import { Router, raw } from 'express';
import {
  createCheckoutSession,
  createUserCheckoutSession,
  getSessionStatus,
} from '../controllers/checkout.controller.js';
import { handleStripeWebhook } from '../controllers/webhook.controller.js';
import {
  getSubscriptionStatus,
  cancelSubscription,
  reactivateSubscription,
  createPortalSession,
} from '../controllers/subscription.controller.js';
import { checkoutLimiter, subscriptionLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Checkout routes
router.post('/checkout/create-session', checkoutLimiter, createCheckoutSession);
router.post('/checkout/create-user-session', checkoutLimiter, createUserCheckoutSession);
router.get('/checkout/session/:session_id', getSessionStatus);

// Webhook route (needs raw body for signature verification)
router.post(
  '/webhooks/stripe',
  raw({ type: 'application/json' }),
  handleStripeWebhook
);

// Subscription routes
router.get('/subscription/status/:payment_token', subscriptionLimiter, getSubscriptionStatus);
router.post('/subscription/cancel', subscriptionLimiter, cancelSubscription);
router.post('/subscription/reactivate', subscriptionLimiter, reactivateSubscription);
router.post('/subscription/portal', subscriptionLimiter, createPortalSession);

export default router;
