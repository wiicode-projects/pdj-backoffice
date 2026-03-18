import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSwitcher } from '../../../shared/components/language-switcher/language-switcher';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'pdj-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, LanguageSwitcher, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword {
  newPassword = signal('');
  confirmPassword = signal('');
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  private token = '';

  readonly passwordsMatch = computed(() => {
    const pwd = this.newPassword();
    const confirm = this.confirmPassword();
    if (!pwd || !confirm) return true;
    return pwd === confirm;
  });

  readonly passwordStrength = computed(() => {
    const pwd = this.newPassword();
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
    private http: HttpClient,
  ) {
    this.route.queryParams.subscribe((params) => {
      this.token = params['token'] || '';
    });
  }

  onNewPasswordInput(value: string): void {
    this.newPassword.set(value);
  }

  onConfirmPasswordInput(value: string): void {
    this.confirmPassword.set(value);
  }

  toggleNewPassword(): void {
    this.showNewPassword.update((v) => !v);
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.update((v) => !v);
  }

  onSubmit(): void {
    const pwd = this.newPassword();
    const confirm = this.confirmPassword();

    if (!pwd || !confirm) {
      this.errorMessage.set('AUTH.FIELDS_REQUIRED');
      return;
    }

    if (pwd !== confirm) {
      this.errorMessage.set('AUTH.PASSWORDS_MISMATCH');
      return;
    }

    if (pwd.length < 8) {
      this.errorMessage.set('AUTH.PASSWORD_TOO_SHORT');
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');
    this.isSubmitting.set(true);

    this.http
      .post(
        `${environment.apiUrl}/auth/password/reset`,
        {
          password: pwd,
          confirmPassword: confirm,
          token: this.token,
        },
      )
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.successMessage.set('AUTH.PASSWORD_RESET_SUCCESS');
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          if (err.status === 401) {
            this.errorMessage.set('AUTH.TOKEN_EXPIRED');
          } else {
            this.errorMessage.set('AUTH.SERVER_ERROR');
          }
        },
      });
  }
}

