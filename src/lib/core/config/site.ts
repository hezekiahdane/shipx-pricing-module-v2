import { env } from '@/lib/core/env';

export type SitemapChangeFrequency =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never';

export interface SitemapPage {
  path: string;
  priority: number;
  changeFrequency: SitemapChangeFrequency;
}

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
  /**
   * Static pages for sitemap generation.
   * Each entry is replicated across all locales.
   * Add new pages here when they are created.
   */
  pages: [
    { path: '', priority: 1.0, changeFrequency: 'weekly' as const },
    { path: '/contact', priority: 0.7, changeFrequency: 'monthly' as const },
  ] satisfies SitemapPage[],
} as const;

export type SiteConfig = typeof siteConfig;
