import Stripe from 'stripe';
import { env } from './env.js';

export const stripe = new Stripe(env.stripe.secretKey, {
  apiVersion: '2023-10-16',
  typescript: true,
});

export const PRICE_IDS = {
  monthly: env.stripe.monthlyPriceId,
  annual: env.stripe.annualPriceId,
} as const;

export type PlanType = keyof typeof PRICE_IDS;
