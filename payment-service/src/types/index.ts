import { z } from 'zod';

// Request schemas
export const createCheckoutSessionSchema = z.object({
  payment_token: z.string().min(1, 'payment_token is required'),
  plan: z.enum(['monthly', 'annual']),
  success_url: z.string().url(),
  cancel_url: z.string().url(),
  payment_method: z.enum(['card', 'pix']).optional(),
});

export const createUserCheckoutSessionSchema = z.object({
  user_id: z.number().int().positive(),
  email: z.string().email(),
  customer_name: z.string().min(1),
  plan: z.enum(['monthly', 'annual']),
  success_url: z.string().url(),
  cancel_url: z.string().url(),
  payment_method: z.enum(['card', 'pix']).optional(),
});

export const cancelSubscriptionSchema = z.object({
  subscription_id: z.string().min(1),
});

export const createPortalSessionSchema = z.object({
  customer_id: z.string().min(1),
  return_url: z.string().url(),
});

// Types
export type CreateCheckoutSessionRequest = z.infer<typeof createCheckoutSessionSchema>;
export type CreateUserCheckoutSessionRequest = z.infer<typeof createUserCheckoutSessionSchema>;
export type CancelSubscriptionRequest = z.infer<typeof cancelSubscriptionSchema>;
export type CreatePortalSessionRequest = z.infer<typeof createPortalSessionSchema>;

// Response types
export interface CheckoutSessionResponse {
  session_id: string;
  checkout_url: string;
}

export interface SubscriptionStatusResponse {
  status: 'active' | 'canceled' | 'past_due' | 'none';
  plan: 'monthly' | 'annual' | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export interface DjangoRegistrationStatus {
  status: string;
  email: string;
  first_name: string;
  email_verified: boolean;
  payment_completed: boolean;
  is_expired: boolean;
  payment_token?: string;
}

export interface DjangoPaymentCallbackPayload {
  payment_token: string;
  stripe_customer_id: string;
  stripe_subscription_id?: string | null;
  plan: 'monthly' | 'annual';
  payment_method?: 'card' | 'pix';
  subscription_ends_at?: string | null;
}

export interface DjangoSubscriptionActivatePayload {
  user_id: number;
  stripe_customer_id: string;
  stripe_subscription_id?: string | null;
  plan: 'monthly' | 'annual';
  payment_method?: 'card' | 'pix';
  subscription_ends_at?: string | null;
}
