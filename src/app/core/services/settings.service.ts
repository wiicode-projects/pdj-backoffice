import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PlatformSettings {
  id: string;
  // MyPos / TWINT (combined)
  twintWebhookUrl: string | null;
  twintMerchantId: string | null;
  twintApiKey: string | null;
  twintEnabled: boolean;
  myposWebhookUrl: string | null;
  myposMerchantId: string | null;
  myposApiKey: string | null;
  myposEnabled: boolean;
  // PayPal
  paypalEnabled: boolean;
  paypalClientId: string | null;
  paypalSecretKey: string | null;
  paypalWebhookUrl: string | null;
  paypalSandbox: boolean;
  // Virement bancaire
  bankTransferEnabled: boolean;
  bankName: string | null;
  bankIban: string | null;
  bankBic: string | null;
  bankAccountHolder: string | null;
  bankReference: string | null;
  // General
  platformName: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  // Email / Brevo
  brevoApiKey: string | null;
  emailSenderName: string | null;
  emailSenderAddress: string | null;
  emailEnabled: boolean;
  emailOtpEnabled: boolean;
  emailWelcomeEnabled: boolean;
  emailPasswordResetEnabled: boolean;
  emailInvoiceEnabled: boolean;
  emailSubscriptionEnabled: boolean;
  updatedAt: string;
}

export interface UpdatePaymentSettingsDto {
  // MyPos / TWINT (combined)
  twintWebhookUrl?: string;
  twintMerchantId?: string;
  twintApiKey?: string;
  twintEnabled?: boolean;
  myposWebhookUrl?: string;
  myposMerchantId?: string;
  myposApiKey?: string;
  myposEnabled?: boolean;
  // PayPal
  paypalEnabled?: boolean;
  paypalClientId?: string;
  paypalSecretKey?: string;
  paypalWebhookUrl?: string;
  paypalSandbox?: boolean;
  // Virement bancaire
  bankTransferEnabled?: boolean;
  bankName?: string;
  bankIban?: string;
  bankBic?: string;
  bankAccountHolder?: string;
  bankReference?: string;
}

export interface UpdateGeneralSettingsDto {
  platformName?: string;
  supportEmail?: string;
  supportPhone?: string;
}

export interface UpdateEmailSettingsDto {
  brevoApiKey?: string;
  emailSenderName?: string;
  emailSenderAddress?: string;
  emailEnabled?: boolean;
  emailOtpEnabled?: boolean;
  emailWelcomeEnabled?: boolean;
  emailPasswordResetEnabled?: boolean;
  emailInvoiceEnabled?: boolean;
  emailSubscriptionEnabled?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly url = `${environment.apiUrl}/settings`;

  constructor(private http: HttpClient) {}

  getSettings(): Observable<PlatformSettings> {
    return this.http.get<PlatformSettings>(this.url);
  }

  updatePayment(dto: UpdatePaymentSettingsDto): Observable<PlatformSettings> {
    return this.http.patch<PlatformSettings>(`${this.url}/payment`, dto);
  }

  updateGeneral(dto: UpdateGeneralSettingsDto): Observable<PlatformSettings> {
    return this.http.patch<PlatformSettings>(`${this.url}/general`, dto);
  }

  updateEmail(dto: UpdateEmailSettingsDto): Observable<PlatformSettings> {
    return this.http.patch<PlatformSettings>(`${this.url}/email`, dto);
  }
}

