import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService, Language } from '../../../core/services/language.service';

@Component({
  selector: 'pdj-language-switcher',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './language-switcher.html',
  styleUrl: './language-switcher.scss',
})
export class LanguageSwitcher {
  isOpen = false;

  constructor(public langService: LanguageService) {}

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
  }

  selectLanguage(lang: Language): void {
    this.langService.setLanguage(lang.code);
    this.isOpen = false;
  }
}
