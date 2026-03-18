import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSwitcher } from '../../../shared/components/language-switcher/language-switcher';
import { environment } from '../../../../environments/environment';

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

  constructor(
    private router: Router,
    private http: HttpClient,
  ) {}

  onSubmit(): void {
    if (!this.email) {
      this.errorMessage.set('AUTH.FIELDS_REQUIRED');
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');
    this.isSubmitting.set(true);

    this.http
      .post<{ status: number; token: string; message: string }>(
        `${environment.apiUrl}/auth/password/forgot`,
        { email: this.email, type: 'PASSWORDFORGET' },
      )
      .subscribe({
        next: (response) => {
          this.isSubmitting.set(false);
          this.router.navigate(['/verify-otp'], {
            queryParams: {
              token: response.token,
              email: this.email,
            },
          });
        },
        error: (err) => {
          this.isSubmitting.set(false);
          if (err.status === 404) {
            this.errorMessage.set('AUTH.EMAIL_NOT_FOUND');
          } else {
            this.errorMessage.set('AUTH.SERVER_ERROR');
          }
        },
      });
  }
}
