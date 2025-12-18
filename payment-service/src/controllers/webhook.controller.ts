import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { stripeService } from '../services/stripe.service.js';
import { djangoService } from '../services/django.service.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export async function handleStripeWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    res.status(400).json({ error: 'Missing stripe-signature header' });
    return;
  }

  try {
    const event = stripeService.constructWebhookEvent(
      req.body, // Raw body buffer
      signature,
      env.stripe.webhookSecret
    );

    logger.info({ eventType: event.type, eventId: event.id }, 'Webhook event received');

    // Handle specific event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      default:
        logger.debug({ eventType: event.type }, 'Unhandled webhook event type');
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
}

/**
 * Chamado quando o checkout é concluído com sucesso
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const paymentToken = session.metadata?.payment_token;
  const plan = session.metadata?.plan as 'monthly' | 'annual';

  if (!paymentToken) {
    logger.error({ sessionId: session.id }, 'Missing payment_token in session metadata');
    return;
  }

  const customerId = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id;

  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id;

  if (!customerId || !subscriptionId) {
    logger.error({ sessionId: session.id }, 'Missing customer or subscription ID');
    return;
  }

  try {
    // Notify Django to complete registration
    await djangoService.notifyPaymentCompleted({
      payment_token: paymentToken,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan: plan || 'monthly',
    });

    logger.info({
      sessionId: session.id,
      paymentToken,
      customerId,
      subscriptionId,
    }, 'Checkout completed and Django notified');
  } catch (error) {
    logger.error({ error, sessionId: session.id }, 'Failed to notify Django of checkout completion');
    // Don't throw - Stripe will retry the webhook
  }
}

/**
 * Chamado quando uma fatura é paga (renovação de assinatura)
 */
async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id;

  if (!customerId) return;

  // Só processa se não for a primeira fatura (checkout já cuidou disso)
  if (invoice.billing_reason === 'subscription_create') {
    logger.debug({ invoiceId: invoice.id }, 'Skipping initial invoice (handled by checkout)');
    return;
  }

  try {
    await djangoService.updateSubscriptionStatus(customerId, 'active');
    logger.info({ invoiceId: invoice.id, customerId }, 'Invoice paid - subscription renewed');
  } catch (error) {
    logger.error({ error, invoiceId: invoice.id }, 'Failed to update subscription status after invoice paid');
  }
}

/**
 * Chamado quando o pagamento de uma fatura falha
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id;

  if (!customerId) return;

  try {
    await djangoService.updateSubscriptionStatus(customerId, 'past_due');
    logger.warn({ invoiceId: invoice.id, customerId }, 'Invoice payment failed');
  } catch (error) {
    logger.error({ error, invoiceId: invoice.id }, 'Failed to update subscription status after payment failure');
  }
}

/**
 * Chamado quando uma assinatura é deletada/cancelada
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id;

  if (!customerId) return;

  try {
    await djangoService.updateSubscriptionStatus(
      customerId,
      'canceled',
      new Date(subscription.ended_at! * 1000).toISOString()
    );
    logger.info({ subscriptionId: subscription.id, customerId }, 'Subscription deleted');
  } catch (error) {
    logger.error({ error, subscriptionId: subscription.id }, 'Failed to update subscription status after deletion');
  }
}

/**
 * Chamado quando uma assinatura é atualizada
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id;

  if (!customerId) return;

  // Map Stripe status to our status
  let status: 'active' | 'canceled' | 'past_due' = 'active';
  if (subscription.status === 'past_due') {
    status = 'past_due';
  } else if (subscription.cancel_at_period_end) {
    // Will be canceled at period end, but still active
    status = 'active';
  } else if (subscription.status === 'canceled') {
    status = 'canceled';
  }

  try {
    await djangoService.updateSubscriptionStatus(customerId, status);
    logger.info({ subscriptionId: subscription.id, customerId, status }, 'Subscription updated');
  } catch (error) {
    logger.error({ error, subscriptionId: subscription.id }, 'Failed to update subscription status');
  }
}
