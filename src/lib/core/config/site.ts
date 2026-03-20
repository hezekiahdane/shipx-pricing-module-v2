import { env } from '@/lib/core/env';

export const siteConfig = {
  name: env.NEXT_PUBLIC_SITE_NAME,
  description:
    'Built on the base system — fast, accessible, and production-ready.',
  url: env.NEXT_PUBLIC_SITE_URL,
  ogImage: '/og-image.png',
  locales: ['en', 'jp'] as const,
  defaultLocale: 'en' as const,
  navLinks: [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/#about' },
    { label: 'Contact', href: '/#contact' },
  ],
  social: {
    twitter: '',
    linkedin: '',
    github: '',
  },
} as const;

export type SiteConfig = typeof siteConfig;
