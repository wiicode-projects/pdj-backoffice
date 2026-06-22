import type { PublicLegalUrls } from '../services/settings.service';

export type DeployEnv = 'development' | 'staging' | 'production';

const LEGAL_URLS_BY_ENV: Record<DeployEnv, PublicLegalUrls> = {
  development: {
    website: 'http://localhost:5173',
    cgu: 'http://localhost:5173/cgu',
    cgv: 'http://localhost:5173/cgv',
    privacy: 'http://localhost:5173/politique-de-confidentialite',
    pricing: 'http://localhost:5173/tarifs',
  },
  staging: {
    website: 'https://sitepdj.wiicode.tech',
    cgu: 'https://sitepdj.wiicode.tech/cgu',
    cgv: 'https://sitepdj.wiicode.tech/cgv',
    privacy: 'https://sitepdj.wiicode.tech/politique-de-confidentialite',
    pricing: 'https://sitepdj.wiicode.tech/tarifs',
  },
  production: {
    website: 'https://leplatdujour.ch',
    cgu: 'https://leplatdujour.ch/cgu',
    cgv: 'https://leplatdujour.ch/cgv',
    privacy: 'https://leplatdujour.ch/politique-de-confidentialite',
    pricing: 'https://leplatdujour.ch/tarifs',
  },
};

/** Fallback when the API is unreachable (e.g. offline dev). */
export const FALLBACK_LEGAL_URLS = LEGAL_URLS_BY_ENV.production;

export function resolveFallbackLegalUrls(): PublicLegalUrls {
  if (typeof window === 'undefined') {
    return LEGAL_URLS_BY_ENV.production;
  }

  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return LEGAL_URLS_BY_ENV.development;
  }
  if (host.includes('wiicode.tech')) {
    return LEGAL_URLS_BY_ENV.staging;
  }
  return LEGAL_URLS_BY_ENV.production;
}

export function deployEnvLabel(env: DeployEnv): string {
  switch (env) {
    case 'development':
      return 'Local';
    case 'staging':
      return 'Staging (dev déployé)';
    case 'production':
      return 'Production';
  }
}
