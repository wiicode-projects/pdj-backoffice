import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageSwitcher } from '../../../shared/components/language-switcher/language-switcher';

@Component({
  selector: 'pdj-login',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, LanguageSwitcher, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  email = '';
  password = '';
  rememberMe = false;
  showPassword = signal(false);
  errorMessage = signal('');
  isSubmitting = signal(false);

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.errorMessage.set('AUTH.FIELDS_REQUIRED');
      return;
    }

    this.errorMessage.set('');
    this.isSubmitting.set(true);

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.router.navigate(['/app/dashboard']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const message = err.error?.message ?? '';
        const isInvalidCredentials =
          err.status === 401 ||
          err.status === 403 ||
          err.status === 404 ||
          message.includes("Erreur sur l'email ou le mot de passe");

        if (isInvalidCredentials) {
          this.errorMessage.set('AUTH.LOGIN_ERROR');
        } else {
          this.errorMessage.set('AUTH.SERVER_ERROR');
        }
      },
    });
  }
}
