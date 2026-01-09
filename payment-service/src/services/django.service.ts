import axios, { AxiosInstance } from 'axios';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { DjangoRegistrationStatus, DjangoPaymentCallbackPayload, DjangoSubscriptionActivatePayload } from '../types/index.js';

class DjangoService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: env.django.apiUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Secret': env.django.serviceSecret,
      },
    });
  }

  /**
   * Busca status do registro pelo payment_token
   */
  async getRegistrationStatus(paymentToken: string): Promise<DjangoRegistrationStatus> {
    try {
      const response = await this.client.get('/registration-status/', {
        params: { token: paymentToken },
      });
      return response.data;
    } catch (error) {
      logger.error({ error, paymentToken }, 'Failed to get registration status from Django');
      throw error;
    }
  }

  /**
   * Notifica Django que o pagamento foi concluído
   */
  async notifyPaymentCompleted(payload: DjangoPaymentCallbackPayload): Promise<{ success: boolean; user_id: number }> {
    try {
      const response = await this.client.post('/payment-callback/', payload);
      logger.info({ payload, response: response.data }, 'Payment callback sent to Django');
      return response.data;
    } catch (error) {
      logger.error({ error, payload }, 'Failed to notify Django of payment completion');
      throw error;
    }
  }

  /**
   * Notifica Django para ativar assinatura de usuário existente
   */
  async activateSubscription(payload: DjangoSubscriptionActivatePayload): Promise<{ success: boolean; user_id: number }> {
    try {
      const response = await this.client.post('/subscription-activate/', payload);
      logger.info({ payload, response: response.data }, 'Subscription activate sent to Django');
      return response.data;
    } catch (error) {
      logger.error({ error, payload }, 'Failed to notify Django of subscription activation');
      throw error;
    }
  }

  /**
   * Notifica Django sobre mudança no status da assinatura
   */
  async updateSubscriptionStatus(
    stripeCustomerId: string,
    status: 'active' | 'canceled' | 'past_due',
    subscriptionEndsAt?: string
  ): Promise<void> {
    try {
      await this.client.post('/subscription-status-update/', {
        stripe_customer_id: stripeCustomerId,
        status,
        subscription_ends_at: subscriptionEndsAt,
      });
      logger.info({ stripeCustomerId, status }, 'Subscription status update sent to Django');
    } catch (error) {
      logger.error({ error, stripeCustomerId, status }, 'Failed to update subscription status in Django');
      throw error;
    }
  }
}

export const djangoService = new DjangoService();
