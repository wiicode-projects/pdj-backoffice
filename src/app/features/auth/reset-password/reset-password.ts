import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSwitcher } from '../../../shared/components/language-switcher/language-switcher';

@Component({
  selector: 'pdj-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, LanguageSwitcher, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword {
  newPassword = '';
  confirmPassword = '';
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  private token = '';

  readonly passwordsMatch = computed(() => {
    if (!this.newPassword || !this.confirmPassword) return true;
    return this.newPassword === this.confirmPassword;
  });

  readonly passwordStrength = computed(() => {
    const pwd = this.newPassword;
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  });

  constructor(
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.route.queryParams.subscribe((params) => {
      this.token = params['token'] || '';
    });
  }

  toggleNewPassword(): void {
    this.showNewPassword.update((v) => !v);
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.update((v) => !v);
  }

  onSubmit(): void {
    if (!this.newPassword || !this.confirmPassword) {
      this.errorMessage.set('AUTH.FIELDS_REQUIRED');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage.set('AUTH.PASSWORDS_MISMATCH');
      return;
    }

    if (this.newPassword.length < 8) {
      this.errorMessage.set('AUTH.PASSWORD_TOO_SHORT');
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');
    this.isSubmitting.set(true);

    // TODO: Replace with actual API call when endpoint is available
    setTimeout(() => {
      this.isSubmitting.set(false);
      this.successMessage.set('AUTH.PASSWORD_RESET_SUCCESS');
    }, 1500);
  }
}
