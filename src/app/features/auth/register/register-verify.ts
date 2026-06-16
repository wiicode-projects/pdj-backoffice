import { Component, OnInit, signal, ViewChildren, QueryList, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { SignupService } from '../../../core/services/signup.service';
import { LanguageSwitcher } from '../../../shared/components/language-switcher/language-switcher';

@Component({
  selector: 'pdj-register-verify',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, LanguageSwitcher, RouterLink],
  templateUrl: './register-verify.html',
  styleUrl: './register-verify.scss',
})
export class RegisterVerify implements AfterViewInit, OnInit {
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  digits: string[] = ['', '', '', ''];
  token = '';
  email = '';
  isSubmitting = signal(false);
  errorMessage = signal('');
  isResending = signal(false);
  resendSuccess = signal('');

  constructor(
    private authService: AuthService,
    private signupService: SignupService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.token = this.signupService.getOtpToken();
    this.email = this.signupService.getOtpEmail();

    if (!this.token || !this.email) {
      this.router.navigate(['/register']);
    }
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

    if (!/^\d*$/.test(value)) {
      input.value = '';
      this.digits[index] = '';
      return;
    }

    this.digits[index] = value;
    this.errorMessage.set('');

    if (value && index < 3) {
      const inputs = this.otpInputs.toArray();
      inputs[index + 1].nativeElement.focus();
    }

    if (this.digits.every((d) => d !== '')) {
      this.onSubmit();
    }
  }

  onKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.digits[index] && index > 0) {
      const inputs = this.otpInputs.toArray();
      inputs[index - 1].nativeElement.focus();
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') || '';
    const pasted = text.replace(/\D/g, '').split('').slice(0, 4);

    pasted.forEach((d, i) => {
      this.digits[i] = d;
    });

    const inputs = this.otpInputs.toArray();
    const nextIndex = Math.min(pasted.length, 3);
    inputs[nextIndex]?.nativeElement.focus();

    if (this.digits.every((d) => d !== '')) {
      this.onSubmit();
    }
  }

  onSubmit(): void {
    const code = this.digits.join('');
    if (code.length !== 4) {
      this.errorMessage.set('AUTH.SIGNUP_OTP_INCOMPLETE');
      return;
    }

    this.errorMessage.set('');
    this.isSubmitting.set(true);

    this.authService.verifyEmailOtp({
      token: this.token,
      code,
      type: 'VERIFYEMAIL',
    }).subscribe({
      next: (response) => {
        this.authService.completeSignupAfterOtp(response).subscribe({
          next: () => {
            this.isSubmitting.set(false);
            this.signupService.clear();
            this.router.navigate(['/app/dashboard']);
          },
          error: () => {
            this.isSubmitting.set(false);
            this.errorMessage.set('AUTH.SERVER_ERROR');
          },
        });
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.digits = ['', '', '', ''];
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

    this.authService.resendSignupOtp({
      email: this.email,
      type: 'VERIFYEMAIL',
    }).subscribe({
      next: (response) => {
        this.token = response.token;
        this.signupService.saveOtpSession(response.token, this.email);
        this.isResending.set(false);
        this.resendSuccess.set('AUTH.OTP_RESENT');
        this.digits = ['', '', '', ''];
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
