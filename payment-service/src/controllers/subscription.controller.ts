import { Request, Response, NextFunction } from 'express';
import { stripeService } from '../services/stripe.service.js';
import { djangoService } from '../services/django.service.js';
import {
  cancelSubscriptionSchema,
  createPortalSessionSchema,
  type SubscriptionStatusResponse,
} from '../types/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export async function getSubscriptionStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { payment_token } = req.params;

    if (!payment_token) {
      throw new AppError('Payment token is required', 400, 'missing_payment_token');
    }

    // Get registration info from Django
    const registration = await djangoService.getRegistrationStatus(payment_token);

    if (!registration.payment_completed) {
      const response: SubscriptionStatusResponse = {
        status: 'none',
        plan: null,
        current_period_end: null,
        cancel_at_period_end: false,
      };
      res.json(response);
      return;
    }

    // TODO: Get subscription details from Django or Stripe
    // For now, return a placeholder
    const response: SubscriptionStatusResponse = {
      status: 'active',
      plan: 'monthly',
      current_period_end: null,
      cancel_at_period_end: false,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

export async function cancelSubscription(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = cancelSubscriptionSchema.parse(req.body);

    const subscription = await stripeService.cancelSubscription(data.subscription_id);

    logger.info({ subscriptionId: data.subscription_id }, 'Subscription cancellation requested');

    res.json({
      success: true,
      cancel_at: subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000).toISOString()
        : new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    });
  } catch (error) {
    next(error);
  }
}

export async function reactivateSubscription(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = cancelSubscriptionSchema.parse(req.body); // Same schema

    const subscription = await stripeService.reactivateSubscription(data.subscription_id);

    logger.info({ subscriptionId: data.subscription_id }, 'Subscription reactivation requested');

    res.json({
      success: true,
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
    });
  } catch (error) {
    next(error);
  }
}

export async function createPortalSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = createPortalSessionSchema.parse(req.body);

    const session = await stripeService.createPortalSession(
      data.customer_id,
      data.return_url
    );

    logger.info({ customerId: data.customer_id }, 'Portal session created');

    res.json({
      portal_url: session.url,
    });
  } catch (error) {
    next(error);
  }
}
