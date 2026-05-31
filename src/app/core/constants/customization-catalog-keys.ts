/** Keys implemented in pdj-mobile card customization (keep in sync with CARD_EFFECTS). */
export type CatalogKeyOption = {
  key: string;
  label: string;
};

export const IMPLEMENTED_EFFECT_KEYS: CatalogKeyOption[] = [
  { key: 'star', label: 'Étoilé' },
  { key: 'media', label: 'Cinématique' },
  { key: 'fire', label: 'Feu' },
  { key: 'bubbles', label: 'Bulles' },
  { key: 'confetti', label: 'Confetti' },
  { key: 'hearts', label: 'Cœurs' },
  { key: 'rainbow', label: 'Arc-en-ciel' },
  { key: 'comet', label: 'Comète' },
  { key: 'snow', label: 'Neige' },
];
