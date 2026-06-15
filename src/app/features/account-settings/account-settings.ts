import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSwitcher } from '../../shared/components/language-switcher/language-switcher';

@Component({
  selector: 'pdj-account-settings',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, LanguageSwitcher],
  templateUrl: './account-settings.html',
  styleUrl: './account-settings.scss',
})
export class AccountSettings {
  readonly appVersion = '1.0.0';
  readonly cguUrl = 'https://www.leplatdujour.ch/cgu';
  readonly privacyUrl = 'https://www.leplatdujour.ch/politique-de-confidentialite';
}
