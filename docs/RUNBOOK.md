# Runbook

Operational procedures for the base-system Next.js application.

## Deployment

### Vercel (recommended)

1. Push to `main` branch — Vercel auto-deploys.
2. Set all required environment variables in Vercel Dashboard → Settings → Environment Variables (see `docs/ENV.md`).
3. Verify the deployment at the preview URL before promoting to production.

### Manual

```bash
npm ci
npm run build
npm run start
```

Set `NODE_ENV=production` and all required env vars before running.

## Health Check

```
GET /api/health
```

Returns `200 OK` with a JSON body when the server is healthy. Use this as your load balancer / uptime monitor target.

## API Endpoints

<!-- AUTO-GENERATED -->

| Method | Path           | Description                                                                  |
| ------ | -------------- | ---------------------------------------------------------------------------- |
| `GET`  | `/api/health`  | Health check — returns 200 when the server is up                             |
| `POST` | `/api/contact` | Contact form submission — validates, rate-limits, and sends email via Resend |

<!-- /AUTO-GENERATED -->

## Common Issues

### Build fails with type errors

```bash
npm run type-check   # see the exact errors
```

Fix the TypeScript errors, then rebuild.

### `RESEND_API_KEY` missing at runtime

The app validates env vars at startup (`src/lib/env.ts`). Set the variable in `.env.local` or the deployment platform's env settings and restart.

### Supabase RLS blocking requests

- Client-side requests use the anon key and are governed by Row Level Security.
- Server-side admin operations use `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS).
- Check your RLS policies in the Supabase Dashboard → Authentication → Policies.

### Rate limiting on `/api/contact`

The contact endpoint enforces a sliding-window rate limit (`src/lib/rate-limit.ts`). If you're hitting limits during testing, restart the dev server to reset the in-memory store.

### CSRF validation failure

The app validates CSRF tokens for mutating requests. Ensure `NEXT_PUBLIC_SITE_URL` matches the actual origin of your requests (including port number in development).

### Generating fresh Supabase types

```bash
npm run db:types
```

Requires `SUPABASE_PROJECT_ID` in `.env.local`. Outputs to `src/types/database.ts`.

## Rollback

On Vercel: Dashboard → Deployments → select a previous deployment → **Promote to Production**.

Manual: revert the git commit, rebuild, and redeploy.

## Monitoring

- **Vercel Analytics** — built in via `@vercel/analytics` (enabled in root layout).
- **Speed Insights** — built in via `@vercel/speed-insights` (enabled in root layout).
- **Health endpoint** — poll `/api/health` from your uptime monitor.

## Internationalization

Locales are configured in `src/i18n/routing.ts`. Translation files live under `messages/`. Adding a new locale requires:

1. Add the locale code to `src/i18n/routing.ts`.
2. Create `messages/<locale>.json`.
3. Restart the dev server.
