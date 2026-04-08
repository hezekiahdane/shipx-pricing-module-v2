import { describe, expect, it } from 'vitest';
import {
  createArticleSchema,
  createBreadcrumbSchema,
  createFaqSchema,
  createHowToSchema,
  createOrganizationSchema,
  createServiceSchema,
  createWebSiteSchema,
} from '@/lib/seo/schema';

describe('createOrganizationSchema', () => {
  it('returns a valid Organization schema', () => {
    const schema = createOrganizationSchema({
      name: 'Acme Corp',
      url: 'https://acme.com',
      logo: 'https://acme.com/logo.png',
      description: 'We build things.',
      sameAs: ['https://linkedin.com/company/acme'],
    });

    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('Organization');
    expect(schema.name).toBe('Acme Corp');
    expect(schema.url).toBe('https://acme.com');
    expect(schema.logo).toBe('https://acme.com/logo.png');
    expect(schema.sameAs).toEqual(['https://linkedin.com/company/acme']);
  });

  it('omits undefined optional fields', () => {
    const schema = createOrganizationSchema({
      name: 'Acme',
      url: 'https://acme.com',
    });

    expect(schema.logo).toBeUndefined();
    expect(schema.sameAs).toBeUndefined();
  });
});

describe('createWebSiteSchema', () => {
  it('returns a valid WebSite schema', () => {
    const schema = createWebSiteSchema({
      name: 'Acme',
      url: 'https://acme.com',
    });

    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('WebSite');
    expect(schema.name).toBe('Acme');
    expect(schema.url).toBe('https://acme.com');
  });
});

describe('createFaqSchema', () => {
  it('returns a valid FAQPage schema', () => {
    const schema = createFaqSchema([
      { question: 'What is Acme?', answer: 'We build things.' },
    ]);

    expect(schema['@type']).toBe('FAQPage');
    expect(schema.mainEntity).toHaveLength(1);
    expect(schema.mainEntity[0]['@type']).toBe('Question');
    expect(schema.mainEntity[0].name).toBe('What is Acme?');
    expect(schema.mainEntity[0].acceptedAnswer['@type']).toBe('Answer');
    expect(schema.mainEntity[0].acceptedAnswer.text).toBe('We build things.');
  });

  it('handles multiple Q&A pairs', () => {
    const schema = createFaqSchema([
      { question: 'Q1', answer: 'A1' },
      { question: 'Q2', answer: 'A2' },
    ]);

    expect(schema.mainEntity).toHaveLength(2);
  });
});

describe('createBreadcrumbSchema', () => {
  it('returns a valid BreadcrumbList schema', () => {
    const schema = createBreadcrumbSchema([
      { name: 'Home', url: 'https://acme.com' },
      { name: 'Services', url: 'https://acme.com/services' },
    ]);

    expect(schema['@type']).toBe('BreadcrumbList');
    expect(schema.itemListElement).toHaveLength(2);
    expect(schema.itemListElement[0].position).toBe(1);
    expect(schema.itemListElement[0].name).toBe('Home');
    expect(schema.itemListElement[1].position).toBe(2);
    expect(schema.itemListElement[1].item).toBe('https://acme.com/services');
  });
});

describe('createServiceSchema', () => {
  it('returns a valid Service schema', () => {
    const schema = createServiceSchema({
      name: 'Freight',
      description: 'Air and sea freight.',
      url: 'https://acme.com/freight',
      providerName: 'Acme Corp',
      providerUrl: 'https://acme.com',
    });

    expect(schema['@type']).toBe('Service');
    expect(schema.name).toBe('Freight');
    expect(schema.provider['@type']).toBe('Organization');
    expect(schema.provider.name).toBe('Acme Corp');
  });

  it('includes optional areaServed when provided', () => {
    const schema = createServiceSchema({
      name: 'Freight',
      description: 'Air and sea freight.',
      url: 'https://acme.com/freight',
      providerName: 'Acme Corp',
      providerUrl: 'https://acme.com',
      areaServed: ['Vietnam', 'Singapore'],
    });

    expect(schema.areaServed).toEqual(['Vietnam', 'Singapore']);
  });
});

describe('createHowToSchema', () => {
  it('returns a valid HowTo schema', () => {
    const schema = createHowToSchema({
      name: 'How to ship',
      steps: [
        { name: 'Register', text: 'Create an account.' },
        { name: 'Book', text: 'Book a shipment.' },
      ],
    });

    expect(schema['@type']).toBe('HowTo');
    expect(schema.name).toBe('How to ship');
    expect(schema.step).toHaveLength(2);
    expect(schema.step[0].position).toBe(1);
    expect(schema.step[0]['@type']).toBe('HowToStep');
    expect(schema.step[1].position).toBe(2);
  });
});

describe('createArticleSchema', () => {
  it('returns a valid Article schema', () => {
    const schema = createArticleSchema({
      headline: 'Top 10 shipping tips',
      description: 'Learn how to ship faster.',
      url: 'https://acme.com/blog/top-10',
      imageUrl: 'https://acme.com/blog/top-10.jpg',
      authorName: 'Jane Doe',
      publishedAt: '2026-01-01T00:00:00Z',
      publisherName: 'Acme Corp',
      publisherLogoUrl: 'https://acme.com/logo.png',
    });

    expect(schema['@type']).toBe('Article');
    expect(schema.headline).toBe('Top 10 shipping tips');
    expect(schema.author['@type']).toBe('Person');
    expect(schema.author.name).toBe('Jane Doe');
    expect(schema.publisher['@type']).toBe('Organization');
    expect(schema.publisher.name).toBe('Acme Corp');
    expect(schema.datePublished).toBe('2026-01-01T00:00:00Z');
  });

  it('includes optional dateModified when provided', () => {
    const schema = createArticleSchema({
      headline: 'Tips',
      description: 'Desc',
      url: 'https://acme.com/blog/tips',
      imageUrl: 'https://acme.com/blog/tips.jpg',
      authorName: 'Jane',
      publishedAt: '2026-01-01T00:00:00Z',
      publisherName: 'Acme',
      publisherLogoUrl: 'https://acme.com/logo.png',
      modifiedAt: '2026-02-01T00:00:00Z',
    });

    expect(schema.dateModified).toBe('2026-02-01T00:00:00Z');
  });
});
