import 'dotenv/config';
import { z } from 'zod';

/**
 * Environment config, validated at startup. Every value has a safe development
 * default so the API boots even if `.env` is missing.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1).default('file:./dev.db'),
  JWT_SECRET: z.string().min(16).default('queuedesk-dev-secret-change-me'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

// Prisma reads DATABASE_URL directly from process.env, so make sure the default is visible to it.
process.env.DATABASE_URL = parsed.data.DATABASE_URL;

export const env = parsed.data;
export type Env = typeof env;
