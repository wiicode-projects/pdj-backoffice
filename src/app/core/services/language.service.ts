import { Injectable, signal, computed } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export interface Language {
  code: string;
  label: string;
  flag: string;
}

export const AVAILABLE_LANGUAGES: Language[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
];

const STORAGE_KEY = 'pdj_lang';
const DEFAULT_LANG = 'fr';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private currentLangCode = signal<string>(DEFAULT_LANG);

  readonly languages = AVAILABLE_LANGUAGES;

  readonly currentLanguage = computed(() =>
    AVAILABLE_LANGUAGES.find((l) => l.code === this.currentLangCode()) ?? AVAILABLE_LANGUAGES[0]
  );

  constructor(private translate: TranslateService) {
    this.translate.addLangs(AVAILABLE_LANGUAGES.map((l) => l.code));
    this.translate.setDefaultLang(DEFAULT_LANG);

    const savedLang = localStorage.getItem(STORAGE_KEY);
    const browserLang = TranslateService.getBrowserLang();
    const initialLang =
      savedLang && this.isSupported(savedLang)
        ? savedLang
        : browserLang && this.isSupported(browserLang)
          ? browserLang
          : DEFAULT_LANG;

    this.setLanguage(initialLang);
  }

  setLanguage(langCode: string): void {
    if (!this.isSupported(langCode)) return;

    this.translate.use(langCode);
    this.currentLangCode.set(langCode);
    localStorage.setItem(STORAGE_KEY, langCode);
    document.documentElement.lang = langCode;
  }

  private isSupported(langCode: string): boolean {
    return AVAILABLE_LANGUAGES.some((l) => l.code === langCode);
  }
}
