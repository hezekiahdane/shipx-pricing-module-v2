# Environment Variables

Copy `.env.example` to `.env.local` and fill in values. **Never commit `.env.local`.**

<!-- AUTO-GENERATED -->

## App

| Variable                | Required | Description                                        | Example                                            |
| ----------------------- | -------- | -------------------------------------------------- | -------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`  | Yes      | Public base URL of the application                 | `http://localhost:3000` / `https://yourdomain.com` |
| `NEXT_PUBLIC_SITE_NAME` | Yes      | Display name used in site metadata and page titles | `"My App"`                                         |

## Resend (Email)

| Variable             | Required | Description                                          | Example                    |
| -------------------- | -------- | ---------------------------------------------------- | -------------------------- |
| `RESEND_API_KEY`     | Yes      | Resend API key (server-side only). Starts with `re_` | `re_abc123XYZ_yourKeyHere` |
| `RESEND_FROM_EMAIL`  | Yes      | Verified sender address for all outgoing emails      | `no-reply@yourdomain.com`  |
| `RESEND_ADMIN_EMAIL` | Yes      | Admin inbox for contact form submissions             | `hello@yourdomain.com`     |

Get your API key at [resend.com/api-keys](https://resend.com/api-keys). The from-address must be a verified sender domain.

## Supabase (Database & Auth)

| Variable                        | Required | Description                                           | Example                      |
| ------------------------------- | -------- | ----------------------------------------------------- | ---------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | Supabase project URL (safe to expose)                 | `https://abcdef.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | Supabase anonymous key (safe to expose, RLS-limited)  | `eyJ...`                     |
| `SUPABASE_SERVICE_ROLE_KEY`     | Yes      | Service role key — **server-side only**, bypasses RLS | `eyJ...`                     |
| `SUPABASE_PROJECT_ID`           | Yes      | Project reference ID for CLI tooling                  | `abcdefghijklmnop`           |

Find these in Supabase Dashboard → Project Settings → API.

## Build & CI (optional)

| Variable              | Required | Description                                                                     | Example                 |
| --------------------- | -------- | ------------------------------------------------------------------------------- | ----------------------- |
| `ANALYZE`             | No       | Enable Next.js bundle analyzer during build                                     | `true`                  |
| `CI`                  | No       | Set by CI providers (GitHub Actions, Vercel) automatically                      | `true`                  |
| `PLAYWRIGHT_BASE_URL` | No       | Override base URL for Playwright E2E tests (defaults to `NEXT_PUBLIC_SITE_URL`) | `http://localhost:3000` |

## Payload CMS (optional)

| Variable         | Required | Description                                                            | Example                             |
| ---------------- | -------- | ---------------------------------------------------------------------- | ----------------------------------- |
| `PAYLOAD_SECRET` | No       | JWT signing secret — min 32 chars. Generate: `openssl rand -base64 32` | `your-long-random-secret`           |
| `DATABASE_URL`   | No       | PostgreSQL connection string for Payload CMS                           | `postgres://user:pass@host:5432/db` |

<!-- /AUTO-GENERATED -->

## Runtime Validation

Environment variables are validated at startup via `src/lib/env.ts`. Missing required variables will throw an error before the server starts.
