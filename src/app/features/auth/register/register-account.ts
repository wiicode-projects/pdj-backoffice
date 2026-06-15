import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { SignupService } from '../../../core/services/signup.service';
import { LanguageSwitcher } from '../../../shared/components/language-switcher/language-switcher';
import { PdjPhoneInput } from '../../../shared/components/phone-input/phone-input';

@Component({
  selector: 'pdj-register-account',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, LanguageSwitcher, RouterLink, PdjPhoneInput],
  templateUrl: './register-account.html',
  styleUrls: ['../login/login.scss', './register.scss'],
})
export class RegisterAccount implements OnInit {
  firstName = '';
  lastName = '';
  email = '';
  phone = '';
  password = '';
  password1 = '';
  acceptTerms = false;
  showPassword = signal(false);
  showPasswordConfirm = signal(false);
  errorMessage = signal('');
  isSubmitting = signal(false);
  restaurantRoleId = '';

  constructor(
    private authService: AuthService,
    private signupService: SignupService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    if (!this.signupService.getRestaurant()) {
      this.router.navigate(['/register']);
      return;
    }

    const account = this.signupService.getAccount();
    if (account) {
      this.firstName = account.firstName;
      this.lastName = account.lastName;
      this.email = account.email;
      this.phone = account.phone;
    }

    this.authService.getRoles().subscribe({
      next: (res) => {
        const role = res.roles.find((r) => r.name === 'RESTAURANT');
        this.restaurantRoleId = role?.id || '';
      },
    });
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  togglePasswordConfirm(): void {
    this.showPasswordConfirm.update((v) => !v);
  }

  private validatePassword(pwd: string): string | null {
    if (pwd.length < 8) return 'AUTH.PASSWORD_TOO_SHORT';
    if (!/[A-Z]/.test(pwd)) return 'AUTH.PASSWORD_NEEDS_UPPERCASE';
    if (!/[a-z]/.test(pwd)) return 'AUTH.PASSWORD_NEEDS_LOWERCASE';
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pwd)) return 'AUTH.PASSWORD_NEEDS_SPECIAL';
    return null;
  }

  onSubmit(): void {
    if (!this.firstName.trim() || !this.lastName.trim() || !this.email.trim() || !this.phone.trim() || !this.password || !this.password1) {
      this.errorMessage.set('AUTH.FIELDS_REQUIRED');
      return;
    }
    if (!this.acceptTerms) {
      this.errorMessage.set('AUTH.SIGNUP_TERMS_REQUIRED');
      return;
    }
    if (this.password !== this.password1) {
      this.errorMessage.set('AUTH.PASSWORDS_MISMATCH');
      return;
    }

    const passwordError = this.validatePassword(this.password);
    if (passwordError) {
      this.errorMessage.set(passwordError);
      return;
    }

    const restaurant = this.signupService.getRestaurant();
    if (!restaurant || !this.restaurantRoleId) {
      this.errorMessage.set('AUTH.SERVER_ERROR');
      return;
    }

    this.errorMessage.set('');
    this.isSubmitting.set(true);

    this.signupService.saveAccount({
      firstName: this.firstName.trim(),
      lastName: this.lastName.trim(),
      email: this.email.trim(),
      phone: this.phone.trim(),
      password: this.password,
      password1: this.password1,
    });

    this.authService.signup({
      user: {
        firstName: this.firstName.trim(),
        lastName: this.lastName.trim(),
        email: this.email.trim(),
        phone: this.phone.trim(),
        password: this.password,
        password1: this.password1,
        roleId: this.restaurantRoleId,
      },
      restaurant: {
        name: restaurant.name,
        city: restaurant.city,
        address: restaurant.address || undefined,
        type: restaurant.type,
        reservationEnabled: restaurant.reservationEnabled,
        googleMapsUrl: restaurant.googleMapsUrl,
      },
    }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.signupService.saveOtpSession(res.token, this.email.trim());
        this.router.navigate(['/register/verify']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const message = err.error?.message || '';
        if (message.includes('Email') || message.includes('email')) {
          this.errorMessage.set('AUTH.SIGNUP_EMAIL_TAKEN');
        } else if (message.includes('téléphone') || message.includes('phone')) {
          this.errorMessage.set('AUTH.SIGNUP_PHONE_TAKEN');
        } else if (message.includes('mot de passe') || message.includes('password')) {
          this.errorMessage.set('AUTH.PASSWORDS_MISMATCH');
        } else {
          this.errorMessage.set('AUTH.SERVER_ERROR');
        }
      },
    });
  }
}
