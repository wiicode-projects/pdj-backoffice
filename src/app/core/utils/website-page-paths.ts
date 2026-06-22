import type { WebsitePage } from '../services/website.service';

export const WEBSITE_PAGE_SLUGS = ['cgu', 'cgv', 'privacy', 'mentions'] as const;
export type WebsitePageSlug = WebsitePage['slug'];

export function isWebsitePageSlug(slug: string): slug is WebsitePageSlug {
  return (WEBSITE_PAGE_SLUGS as readonly string[]).includes(slug);
}

/** Public website paths (for “view on site” links). */
export const WEBSITE_PAGE_PUBLIC_PATHS: Record<WebsitePageSlug, string> = {
  cgu: '/cgu',
  cgv: '/cgv',
  privacy: '/politique-de-confidentialite',
  mentions: '/mentions-legales',
};
