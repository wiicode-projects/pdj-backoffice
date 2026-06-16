import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { SignupService } from '../../../core/services/signup.service';
import { LanguageSwitcher } from '../../../shared/components/language-switcher/language-switcher';

@Component({
  selector: 'pdj-register-restaurant',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, LanguageSwitcher, RouterLink],
  templateUrl: './register-restaurant.html',
  styleUrls: ['../login/login.scss', './register.scss'],
})
export class RegisterRestaurant implements OnInit {
  name = '';
  city = '';
  address = '';
  googleMapsUrl = '';
  restaurantRoleId = '';
  errorMessage = signal('');
  isSubmitting = signal(false);

  constructor(
    private authService: AuthService,
    private signupService: SignupService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const draft = this.signupService.getRestaurant();
    if (draft) {
      this.name = draft.name;
      this.city = draft.city;
      this.address = draft.address;
      this.googleMapsUrl = draft.googleMapsUrl || '';
    }

    this.authService.getRoles().subscribe({
      next: (res) => {
        const role = res.roles.find((r) => r.name === 'RESTAURANT');
        this.restaurantRoleId = role?.id || '';
      },
      error: () => {
        this.errorMessage.set('AUTH.SERVER_ERROR');
      },
    });
  }

  onSubmit(): void {
    if (!this.name.trim() || !this.city.trim()) {
      this.errorMessage.set('AUTH.SIGNUP_RESTAURANT_REQUIRED');
      return;
    }
    if (!this.restaurantRoleId) {
      this.errorMessage.set('AUTH.SERVER_ERROR');
      return;
    }

    this.errorMessage.set('');
    this.isSubmitting.set(true);

    this.signupService.saveRestaurant({
      name: this.name.trim(),
      city: this.city.trim(),
      address: this.address.trim(),
      type: 'FIXE',
      reservationEnabled: false,
      googleMapsUrl: this.googleMapsUrl.trim() || undefined,
    });

    this.isSubmitting.set(false);
    this.router.navigate(['/register/account']);
  }
}
