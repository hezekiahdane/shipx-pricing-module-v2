import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM_EMAIL: z.string().email().optional(),
    RESEND_ADMIN_EMAIL: z.string().email().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    DATABASE_URL: z.string().url().optional(),
    DATABASE_URL_DIRECT: z.string().url().optional(),
    AUTH_SECRET: z.string().min(1).optional(),
    ARCJET_KEY: z.string().min(1).optional(),
    SENTRY_DSN: z.string().url().optional(),
    SENTRY_AUTH_TOKEN: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
    NEXT_PUBLIC_SITE_NAME: z.string().default('My App'),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_VERCEL_ENV: z
      .enum(['production', 'preview', 'development'])
      .optional(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    RESEND_ADMIN_EMAIL: process.env.RESEND_ADMIN_EMAIL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_URL_DIRECT: process.env.DATABASE_URL_DIRECT,
    AUTH_SECRET: process.env.AUTH_SECRET,
    ARCJET_KEY: process.env.ARCJET_KEY,
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
