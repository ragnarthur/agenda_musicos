import Stripe from 'stripe';
import { stripe, PRICE_IDS, type PlanType } from '../config/stripe.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

const PLAN_LABELS: Record<PlanType, string> = {
  monthly: 'Assinatura Mensal',
  annual: 'Assinatura Anual',
};

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
    paymentMethod?: 'card' | 'pix';
  }): Promise<Stripe.Checkout.Session> {
    const priceId = PRICE_IDS[params.plan];
    const paymentMethod = params.paymentMethod ?? 'card';

    try {
      // Criar customer primeiro (requerido pelo Stripe Accounts V2)
      const customer = await stripe.customers.create({
        email: params.email,
        name: params.customerName,
        metadata: {
          payment_token: params.paymentToken,
        },
      });

      logger.info({ customerId: customer.id, email: params.email }, 'Customer created');

      if (paymentMethod === 'pix') {
        const price = await stripe.prices.retrieve(priceId);
        if (price.unit_amount == null || !price.currency) {
          throw new AppError('Invalid price configuration for Pix', 500, 'pix_price_error');
        }

        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          payment_method_types: ['pix'],
          line_items: [
            {
              price_data: {
                currency: price.currency,
                unit_amount: price.unit_amount,
                product_data: {
                  name: PLAN_LABELS[params.plan],
                },
              },
              quantity: 1,
            },
          ],
          customer: customer.id,
          metadata: {
            payment_token: params.paymentToken,
            plan: params.plan,
            payment_method: 'pix',
          },
          payment_intent_data: {
            metadata: {
              payment_token: params.paymentToken,
              plan: params.plan,
              payment_method: 'pix',
            },
          },
          success_url: `${params.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: params.cancelUrl,
          locale: 'pt-BR',
        });

        logger.info({
          sessionId: session.id,
          paymentToken: params.paymentToken,
          plan: params.plan,
          paymentMethod: 'pix',
        }, 'Pix checkout session created');

        return session;
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        customer: customer.id,
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
   * Cria uma sessão de checkout para usuário existente (upgrade/trial)
   */
  async createUserCheckoutSession(params: {
    userId: number;
    email: string;
    customerName: string;
    plan: PlanType;
    successUrl: string;
    cancelUrl: string;
    paymentMethod?: 'card' | 'pix';
  }): Promise<Stripe.Checkout.Session> {
    const priceId = PRICE_IDS[params.plan];
    const paymentMethod = params.paymentMethod ?? 'card';

    try {
      const customer = await stripe.customers.create({
        email: params.email,
        name: params.customerName,
        metadata: {
          user_id: String(params.userId),
        },
      });

      logger.info({ customerId: customer.id, userId: params.userId }, 'Customer created for upgrade');

      if (paymentMethod === 'pix') {
        const price = await stripe.prices.retrieve(priceId);
        if (price.unit_amount == null || !price.currency) {
          throw new AppError('Invalid price configuration for Pix', 500, 'pix_price_error');
        }

        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          payment_method_types: ['pix'],
          line_items: [
            {
              price_data: {
                currency: price.currency,
                unit_amount: price.unit_amount,
                product_data: {
                  name: PLAN_LABELS[params.plan],
                },
              },
              quantity: 1,
            },
          ],
          customer: customer.id,
          client_reference_id: String(params.userId),
          metadata: {
            user_id: String(params.userId),
            plan: params.plan,
            source: 'upgrade',
            payment_method: 'pix',
          },
          payment_intent_data: {
            metadata: {
              user_id: String(params.userId),
              plan: params.plan,
              source: 'upgrade',
              payment_method: 'pix',
            },
          },
          success_url: `${params.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: params.cancelUrl,
          locale: 'pt-BR',
        });

        logger.info({
          sessionId: session.id,
          userId: params.userId,
          plan: params.plan,
          paymentMethod: 'pix',
        }, 'Pix upgrade checkout session created');

        return session;
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        customer: customer.id,
        client_reference_id: String(params.userId),
        metadata: {
          user_id: String(params.userId),
          plan: params.plan,
          source: 'upgrade',
        },
        subscription_data: {
          metadata: {
            user_id: String(params.userId),
            plan: params.plan,
            source: 'upgrade',
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
        userId: params.userId,
        plan: params.plan,
      }, 'Upgrade checkout session created');

      return session;
    } catch (error) {
      logger.error({ error, params }, 'Failed to create upgrade checkout session');
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
