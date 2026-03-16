import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSwitcher } from './shared/components/language-switcher/language-switcher';
import { LanguageService } from './core/services/language.service';

@Component({
  selector: 'pdj-root',
  standalone: true,
  imports: [RouterOutlet, TranslateModule, LanguageSwitcher],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  // LanguageService is injected to trigger initialization on app start
  constructor(private langService: LanguageService) {}
}
