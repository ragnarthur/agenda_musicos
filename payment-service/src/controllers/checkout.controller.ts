import { Request, Response, NextFunction } from 'express';
import { stripeService } from '../services/stripe.service.js';
import { djangoService } from '../services/django.service.js';
import { createCheckoutSessionSchema, type CheckoutSessionResponse } from '../types/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export async function createCheckoutSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const data = createCheckoutSessionSchema.parse(req.body);

    // Verify registration status with Django
    const registration = await djangoService.getRegistrationStatus(data.payment_token);

    if (registration.is_expired) {
      throw new AppError('Registration expired. Please register again.', 400, 'registration_expired');
    }

    if (!registration.email_verified) {
      throw new AppError('Email not verified. Please verify your email first.', 400, 'email_not_verified');
    }

    if (registration.payment_completed) {
      throw new AppError('Payment already completed.', 400, 'payment_already_completed');
    }

    // Create Stripe checkout session
    const session = await stripeService.createCheckoutSession({
      paymentToken: data.payment_token,
      email: registration.email,
      customerName: registration.first_name,
      plan: data.plan,
      successUrl: data.success_url,
      cancelUrl: data.cancel_url,
    });

    const response: CheckoutSessionResponse = {
      session_id: session.id,
      checkout_url: session.url!,
    };

    logger.info({
      paymentToken: data.payment_token,
      sessionId: session.id,
      plan: data.plan,
    }, 'Checkout session created successfully');

    res.json(response);
  } catch (error) {
    next(error);
  }
}

export async function getSessionStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { session_id } = req.params;

    if (!session_id) {
      throw new AppError('Session ID is required', 400, 'missing_session_id');
    }

    const session = await stripeService.getCheckoutSession(session_id);

    res.json({
      status: session.status,
      payment_status: session.payment_status,
      customer_email: session.customer_email,
      subscription_id: session.subscription,
    });
  } catch (error) {
    next(error);
  }
}
