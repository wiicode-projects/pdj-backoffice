import { Injectable } from '@angular/core';

export interface SignupRestaurantDraft {
  name: string;
  city: string;
  address: string;
  type: 'FIXE' | 'ITINERANT';
  reservationEnabled: boolean;
  googleMapsUrl?: string;
}

export interface SignupAccountDraft {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  password1: string;
}

const RESTAURANT_KEY = 'pdj_signup_restaurant';
const ACCOUNT_KEY = 'pdj_signup_account';
const OTP_TOKEN_KEY = 'pdj_signup_otp_token';
const OTP_EMAIL_KEY = 'pdj_signup_otp_email';

@Injectable({
  providedIn: 'root',
})
export class SignupService {
  saveRestaurant(draft: SignupRestaurantDraft): void {
    sessionStorage.setItem(RESTAURANT_KEY, JSON.stringify(draft));
  }

  getRestaurant(): SignupRestaurantDraft | null {
    const raw = sessionStorage.getItem(RESTAURANT_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SignupRestaurantDraft;
    } catch {
      return null;
    }
  }

  saveAccount(draft: SignupAccountDraft): void {
    sessionStorage.setItem(ACCOUNT_KEY, JSON.stringify(draft));
  }

  getAccount(): SignupAccountDraft | null {
    const raw = sessionStorage.getItem(ACCOUNT_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SignupAccountDraft;
    } catch {
      return null;
    }
  }

  saveOtpSession(token: string, email: string): void {
    sessionStorage.setItem(OTP_TOKEN_KEY, token);
    sessionStorage.setItem(OTP_EMAIL_KEY, email);
  }

  getOtpToken(): string {
    return sessionStorage.getItem(OTP_TOKEN_KEY) || '';
  }

  getOtpEmail(): string {
    return sessionStorage.getItem(OTP_EMAIL_KEY) || '';
  }

  clear(): void {
    sessionStorage.removeItem(RESTAURANT_KEY);
    sessionStorage.removeItem(ACCOUNT_KEY);
    sessionStorage.removeItem(OTP_TOKEN_KEY);
    sessionStorage.removeItem(OTP_EMAIL_KEY);
  }
}
