export interface OrganizationSchemaInput {
  name: string;
  url: string;
  logo?: string;
  description?: string;
  sameAs?: string[];
}

export interface WebSiteSchemaInput {
  name: string;
  url: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface ServiceSchemaInput {
  name: string;
  description: string;
  url: string;
  providerName: string;
  providerUrl: string;
  serviceType?: string;
  areaServed?: string[];
}

export interface HowToStep {
  name: string;
  text: string;
}

export interface HowToSchemaInput {
  name: string;
  steps: HowToStep[];
}

export interface ArticleSchemaInput {
  headline: string;
  description: string;
  url: string;
  imageUrl: string;
  authorName: string;
  publishedAt: string;
  publisherName: string;
  publisherLogoUrl: string;
  modifiedAt?: string;
}

export function createOrganizationSchema(input: OrganizationSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: input.name,
    url: input.url,
    ...(input.logo !== undefined && { logo: input.logo }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.sameAs !== undefined && { sameAs: input.sameAs }),
  } as const;
}

export function createWebSiteSchema(input: WebSiteSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: input.name,
    url: input.url,
  } as const;
}

export function createFaqSchema(faqs: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function createBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function createServiceSchema(input: ServiceSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: input.name,
    description: input.description,
    url: input.url,
    provider: {
      '@type': 'Organization',
      name: input.providerName,
      url: input.providerUrl,
    },
    ...(input.serviceType !== undefined && { serviceType: input.serviceType }),
    ...(input.areaServed !== undefined && { areaServed: input.areaServed }),
  };
}

export function createHowToSchema(input: HowToSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: input.name,
    step: input.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

export function createArticleSchema(input: ArticleSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    url: input.url,
    image: input.imageUrl,
    author: {
      '@type': 'Person',
      name: input.authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: input.publisherName,
      logo: {
        '@type': 'ImageObject',
        url: input.publisherLogoUrl,
      },
    },
    datePublished: input.publishedAt,
    ...(input.modifiedAt !== undefined && { dateModified: input.modifiedAt }),
  };
}
