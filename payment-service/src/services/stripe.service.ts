import Stripe from 'stripe';
import { stripe, PRICE_IDS, type PlanType } from '../config/stripe.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

class StripeService {
  /**
   * Cria uma sessão de checkout do Stripe
   */
  async createCheckoutSession(params: {
    paymentToken: string;
    email: string;
    customerName: string;
    plan: PlanType;
    successUrl: string;
    cancelUrl: string;
  }): Promise<Stripe.Checkout.Session> {
    const priceId = PRICE_IDS[params.plan];

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        customer_email: params.email,
        metadata: {
          payment_token: params.paymentToken,
          plan: params.plan,
        },
        subscription_data: {
          metadata: {
            payment_token: params.paymentToken,
            plan: params.plan,
          },
        },
        success_url: `${params.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: params.cancelUrl,
        locale: 'pt-BR',
        allow_promotion_codes: true,
        billing_address_collection: 'required',
      });

      logger.info({
        sessionId: session.id,
        paymentToken: params.paymentToken,
        plan: params.plan,
      }, 'Checkout session created');

      return session;
    } catch (error) {
      logger.error({ error, params }, 'Failed to create checkout session');
      throw new AppError('Failed to create checkout session', 500, 'stripe_session_error');
    }
  }

  /**
   * Recupera uma sessão de checkout
   */
  async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    try {
      return await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'customer'],
      });
    } catch (error) {
      logger.error({ error, sessionId }, 'Failed to retrieve checkout session');
      throw new AppError('Checkout session not found', 404, 'session_not_found');
    }
  }

  /**
   * Recupera detalhes de uma assinatura
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await stripe.subscriptions.retrieve(subscriptionId);
    } catch (error) {
      logger.error({ error, subscriptionId }, 'Failed to retrieve subscription');
      throw new AppError('Subscription not found', 404, 'subscription_not_found');
    }
  }

  /**
   * Cancela uma assinatura (no final do período)
   */
  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });

      logger.info({ subscriptionId }, 'Subscription scheduled for cancellation');
      return subscription;
    } catch (error) {
      logger.error({ error, subscriptionId }, 'Failed to cancel subscription');
      throw new AppError('Failed to cancel subscription', 500, 'cancel_error');
    }
  }

  /**
   * Reativa uma assinatura cancelada (antes do período terminar)
   */
  async reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });

      logger.info({ subscriptionId }, 'Subscription reactivated');
      return subscription;
    } catch (error) {
      logger.error({ error, subscriptionId }, 'Failed to reactivate subscription');
      throw new AppError('Failed to reactivate subscription', 500, 'reactivate_error');
    }
  }

  /**
   * Cria portal do cliente para gerenciar pagamento
   */
  async createPortalSession(customerId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session> {
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      logger.info({ customerId, sessionId: session.id }, 'Portal session created');
      return session;
    } catch (error) {
      logger.error({ error, customerId }, 'Failed to create portal session');
      throw new AppError('Failed to create portal session', 500, 'portal_error');
    }
  }

  /**
   * Verifica assinatura do webhook
   */
  constructWebhookEvent(payload: Buffer, signature: string, secret: string): Stripe.Event {
    try {
      return stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (error) {
      logger.error({ error }, 'Webhook signature verification failed');
      throw new AppError('Webhook signature verification failed', 400, 'webhook_signature_error');
    }
  }
}

export const stripeService = new StripeService();
