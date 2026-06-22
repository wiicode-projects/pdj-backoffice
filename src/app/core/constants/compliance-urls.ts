/** Fallback when the API is unreachable (e.g. offline dev). */
export const FALLBACK_LEGAL_URLS = {
  website: 'https://leplatdujour.ch',
  cgu: 'https://leplatdujour.ch/cgu',
  cgv: 'https://leplatdujour.ch/cgv',
  privacy: 'https://leplatdujour.ch/politique-de-confidentialite',
  pricing: 'https://leplatdujour.ch/tarifs',
} as const;
