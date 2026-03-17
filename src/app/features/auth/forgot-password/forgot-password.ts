import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSwitcher } from '../../../shared/components/language-switcher/language-switcher';

@Component({
  selector: 'pdj-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, LanguageSwitcher, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  email = '';
  isSubmitting = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  constructor(private router: Router) {}

  onSubmit(): void {
    if (!this.email) {
      this.errorMessage.set('AUTH.FIELDS_REQUIRED');
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');
    this.isSubmitting.set(true);

    // TODO: Replace with actual API call when endpoint is available
    // For now, simulate a success response
    setTimeout(() => {
      this.isSubmitting.set(false);
      this.successMessage.set('AUTH.RESET_LINK_SENT');
    }, 1500);
  }
}
