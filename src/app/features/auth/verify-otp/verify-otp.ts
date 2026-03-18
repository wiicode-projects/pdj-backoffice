import { Component, signal, ViewChildren, QueryList, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSwitcher } from '../../../shared/components/language-switcher/language-switcher';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'pdj-verify-otp',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, LanguageSwitcher, RouterLink],
  templateUrl: './verify-otp.html',
  styleUrl: './verify-otp.scss',
})
export class VerifyOtp implements AfterViewInit {
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  digits: string[] = ['', '', '', '', '', ''];
  token = '';
  email = '';
  isSubmitting = signal(false);
  errorMessage = signal('');
  isResending = signal(false);
  resendSuccess = signal('');

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
  ) {
    this.route.queryParams.subscribe((params) => {
      this.token = params['token'] || '';
      this.email = params['email'] || '';
    });
  }

  ngAfterViewInit(): void {
    const inputs = this.otpInputs.toArray();
    if (inputs.length > 0) {
      inputs[0].nativeElement.focus();
    }
  }

  onDigitInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    // Only allow digits
    if (!/^\d*$/.test(value)) {
      input.value = '';
      this.digits[index] = '';
      return;
    }

    this.digits[index] = value;
    this.errorMessage.set('');

    // Auto-advance to next input
    if (value && index < 5) {
      const inputs = this.otpInputs.toArray();
      inputs[index + 1].nativeElement.focus();
    }

    // Auto-submit when all 6 digits are filled
    if (this.digits.every((d) => d !== '')) {
      this.onSubmit();
    }
  }

  onKeyDown(event: KeyboardEvent, index: number): void {
    // Handle backspace — go to previous input
    if (event.key === 'Backspace' && !this.digits[index] && index > 0) {
      const inputs = this.otpInputs.toArray();
      inputs[index - 1].nativeElement.focus();
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') || '';
    const digits = text.replace(/\D/g, '').split('').slice(0, 6);

    digits.forEach((d, i) => {
      this.digits[i] = d;
    });

    const inputs = this.otpInputs.toArray();
    const nextIndex = Math.min(digits.length, 5);
    inputs[nextIndex].nativeElement.focus();

    if (this.digits.every((d) => d !== '')) {
      this.onSubmit();
    }
  }

  onSubmit(): void {
    const code = this.digits.join('');
    if (code.length !== 6) {
      this.errorMessage.set('AUTH.OTP_INCOMPLETE');
      return;
    }

    this.errorMessage.set('');
    this.isSubmitting.set(true);

    this.http
      .post<{ status: number; token: string; message: string }>(
        `${environment.apiUrl}/auth/verify-otp`,
        { token: this.token, code, type: 'PASSWORD' },
      )
      .subscribe({
        next: (response) => {
          this.isSubmitting.set(false);
          this.router.navigate(['/reset-password'], {
            queryParams: { token: response.token },
          });
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.digits = ['', '', '', '', '', ''];
          const inputs = this.otpInputs.toArray();
          if (inputs.length > 0) inputs[0].nativeElement.focus();

          if (err.status === 404) {
            this.errorMessage.set('AUTH.OTP_INVALID');
          } else if (err.status === 403) {
            this.errorMessage.set('AUTH.OTP_EXPIRED');
          } else {
            this.errorMessage.set('AUTH.SERVER_ERROR');
          }
        },
      });
  }

  resendCode(): void {
    if (!this.email) return;

    this.resendSuccess.set('');
    this.isResending.set(true);

    this.http
      .post<{ status: number; token: string; message: string }>(
        `${environment.apiUrl}/auth/password/forgot`,
        { email: this.email, type: 'PASSWORDFORGET' },
      )
      .subscribe({
        next: (response) => {
          this.token = response.token;
          this.isResending.set(false);
          this.resendSuccess.set('AUTH.OTP_RESENT');
          this.digits = ['', '', '', '', '', ''];
          const inputs = this.otpInputs.toArray();
          if (inputs.length > 0) inputs[0].nativeElement.focus();
        },
        error: () => {
          this.isResending.set(false);
          this.errorMessage.set('AUTH.SERVER_ERROR');
        },
      });
  }
}
