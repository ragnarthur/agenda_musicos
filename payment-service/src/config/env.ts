import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Server
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, 'STRIPE_WEBHOOK_SECRET is required'),
  STRIPE_MONTHLY_PRICE_ID: z.string().min(1, 'STRIPE_MONTHLY_PRICE_ID is required'),
  STRIPE_ANNUAL_PRICE_ID: z.string().min(1, 'STRIPE_ANNUAL_PRICE_ID is required'),

  // Django Integration
  // Em Docker/produção, o container fala com o service "backend"
  DJANGO_API_URL: z.string().url().default('http://backend:8000/api'),
  PAYMENT_SERVICE_SECRET: z.string().min(1, 'PAYMENT_SERVICE_SECRET is required'),

  // CORS (lista separada por vírgula)
  // Mesmo com Nginx (mesma origem) isso geralmente não atrapalha, só ajuda em cenários alternativos.
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173,http://181.215.134.53'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

const allowedOrigins = parsed.data.ALLOWED_ORIGINS.split(',')
  .map(s => s.trim())
  .filter(Boolean);

export const env = {
  port: parsed.data.PORT,
  nodeEnv: parsed.data.NODE_ENV,
  isDev: parsed.data.NODE_ENV === 'development',
  isProd: parsed.data.NODE_ENV === 'production',

  stripe: {
    secretKey: parsed.data.STRIPE_SECRET_KEY,
    webhookSecret: parsed.data.STRIPE_WEBHOOK_SECRET,
    monthlyPriceId: parsed.data.STRIPE_MONTHLY_PRICE_ID,
    annualPriceId: parsed.data.STRIPE_ANNUAL_PRICE_ID,
  },

  django: {
    apiUrl: parsed.data.DJANGO_API_URL,
    serviceSecret: parsed.data.PAYMENT_SERVICE_SECRET,
  },

  cors: {
    allowedOrigins,
  },
};
