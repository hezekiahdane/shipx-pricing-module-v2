import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Analytics, SpeedInsights } from '@/lib/monitoring';
import '@/app/globals.css';

import { JsonLd } from '@/components/common/JsonLd';
import { DevPanelWrapper } from '@/components/dev/DevPanelWrapper';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import { devPanelConfig } from '@/config/dev-panel.config';
import { siteConfig } from '@/lib/core/config/site';
import { env } from '@/lib/core/env';
import { createOrganizationSchema, createWebSiteSchema } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const title = siteConfig.name;
  const description = siteConfig.description;

  // Build hreflang alternates: { en: 'https://...', jp: 'https://...' }
  const languages = Object.fromEntries(
    siteConfig.locales.map((l) => [l, `${siteConfig.url}/${l}`]),
  );

  return {
    title: {
      default: title,
      template: `%s | ${siteConfig.name}`,
    },
    description,
    metadataBase: new URL(siteConfig.url),
    icons: {
      icon: '/favicon.ico',
      shortcut: '/favicon.ico',
      apple: '/apple-touch-icon.png',
    },
    alternates: {
      languages,
    },
    openGraph: {
      title,
      description,
      url: siteConfig.url,
      siteName: siteConfig.name,
      locale,
      type: 'website',
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: siteConfig.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [siteConfig.ogImage],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  const isDev =
    process.env.NODE_ENV === 'development' || // NODE_ENV: Next.js static analysis exception
    env.NEXT_PUBLIC_VERCEL_ENV === 'preview';

  const orgSchema = createOrganizationSchema({
    name: siteConfig.name,
    url: siteConfig.url,
    sameAs: Object.values(siteConfig.social).filter(Boolean),
  });

  const websiteSchema = createWebSiteSchema({
    name: siteConfig.name,
    url: siteConfig.url,
  });

  return (
    <html lang={locale}>
      <body className="font-body flex min-h-screen flex-col">
        <JsonLd schema={[orgSchema, websiteSchema]} />
        <NextIntlClientProvider messages={messages} locale={locale}>
          {isDev ? (
            <DevPanelWrapper config={devPanelConfig}>
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
            </DevPanelWrapper>
          ) : (
            <>
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
            </>
          )}
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
