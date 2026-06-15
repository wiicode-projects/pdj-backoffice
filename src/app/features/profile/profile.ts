import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'pdj-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  loading = true;
  saving = false;
  savingPassword = false;
  error = '';
  successMessage = '';
  passwordError = '';
  passwordSuccess = '';

  firstName = '';
  lastName = '';
  email = '';
  phone = '';
  password = '';
  confirmPassword = '';

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private cdr: ChangeDetectorRef,
  ) {}

  get userId(): string | null {
    return this.authService.user()?.id ?? null;
  }

  ngOnInit(): void {
    this.populateForm();
    this.loading = false;
  }

  private populateForm(): void {
    const user = this.authService.user();
    if (!user) return;
    this.firstName = user.firstName || '';
    this.lastName = user.lastName || '';
    this.email = user.email || '';
    this.phone = user.phone || '';
  }

  saveProfile(): void {
    const id = this.userId;
    if (!id) return;
    if (!this.firstName.trim() || !this.lastName.trim() || !this.email.trim()) {
      this.error = 'PROFILE.REQUIRED_FIELDS';
      return;
    }

    this.saving = true;
    this.error = '';
    this.successMessage = '';

    this.userService.updateProfile(id, {
      firstName: this.firstName.trim(),
      lastName: this.lastName.trim(),
      email: this.email.trim(),
      phone: this.phone.trim() || undefined,
    })
      .pipe(finalize(() => {
        this.saving = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.authService.fetchAndStoreUserInfo().subscribe({
            next: () => {
              this.successMessage = 'PROFILE.SAVE_SUCCESS';
              setTimeout(() => {
                this.successMessage = '';
                this.cdr.detectChanges();
              }, 3000);
              this.cdr.detectChanges();
            },
          });
        },
        error: (err) => {
          this.error = err.error?.message || 'PROFILE.SAVE_ERROR';
          this.cdr.detectChanges();
        },
      });
  }

  savePassword(): void {
    const id = this.userId;
    if (!id) return;

    if (!this.password || this.password.length < 8) {
      this.passwordError = 'PROFILE.PASSWORD_MIN';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.passwordError = 'PROFILE.PASSWORD_MISMATCH';
      return;
    }

    this.savingPassword = true;
    this.passwordError = '';
    this.passwordSuccess = '';

    this.userService.changePassword(id, this.password, this.confirmPassword)
      .pipe(finalize(() => {
        this.savingPassword = false;
        this.password = '';
        this.confirmPassword = '';
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.passwordSuccess = 'PROFILE.PASSWORD_SUCCESS';
          setTimeout(() => {
            this.passwordSuccess = '';
            this.cdr.detectChanges();
          }, 3000);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.passwordError = err.error?.message || 'PROFILE.PASSWORD_ERROR';
          this.cdr.detectChanges();
        },
      });
  }
}
