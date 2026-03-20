/**
 * i18n routing configuration.
 *
 * Locales and default locale are driven by src/config/site.ts — that is the
 * single place to change them for a new project.
 *
 * Steps to add/change a locale:
 *   1. Update `locales` and `defaultLocale` in src/config/site.ts
 *   2. Add the matching messages/<locale>.json file
 *   3. That's it — routing, middleware, and metadata update automatically.
 */

import { createNavigation } from 'next-intl/navigation';
import { defineRouting } from 'next-intl/routing';
import { siteConfig } from '@/lib/core/config/site';

export const routing = defineRouting({
  locales: siteConfig.locales,
  defaultLocale: siteConfig.defaultLocale,
});

// Lightweight wrappers around Next.js' navigation APIs
// that will preserve the locale automatically
export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
