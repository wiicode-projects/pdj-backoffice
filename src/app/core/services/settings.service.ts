import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type EmailProvider = 'brevo' | 'kreativmedia';

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
  myposTestMode: boolean;
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
  // Email providers
  emailProvider: EmailProvider;
  brevoEnabled: boolean;
  brevoApiKey: string | null;
  kreativMediaEnabled: boolean;
  kreativMediaSmtpHost: string | null;
  kreativMediaSmtpPort: number;
  kreativMediaSmtpUser: string | null;
  kreativMediaSmtpPassword: string | null;
  kreativMediaSmtpSecure: boolean;
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
  myposTestMode?: boolean;
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
  emailProvider?: EmailProvider;
  brevoEnabled?: boolean;
  brevoApiKey?: string;
  kreativMediaEnabled?: boolean;
  kreativMediaSmtpHost?: string;
  kreativMediaSmtpPort?: number;
  kreativMediaSmtpUser?: string;
  kreativMediaSmtpPassword?: string;
  kreativMediaSmtpSecure?: boolean;
  emailSenderName?: string;
  emailSenderAddress?: string;
  emailEnabled?: boolean;
  emailOtpEnabled?: boolean;
  emailWelcomeEnabled?: boolean;
  emailPasswordResetEnabled?: boolean;
  emailInvoiceEnabled?: boolean;
  emailSubscriptionEnabled?: boolean;
}

export type ComplianceUrlCategory =
  | 'website'
  | 'legal'
  | 'registration'
  | 'pricing'
  | 'ipc';

export interface ComplianceUrlItem {
  key: string;
  label: string;
  description: string;
  url: string;
  category: ComplianceUrlCategory;
}

export interface ComplianceUrlHealthItem extends ComplianceUrlItem {
  ok: boolean;
  statusCode: number | null;
  error?: string;
}

export type DeployEnv = 'development' | 'staging' | 'production';

export interface ComplianceUrlsResponse {
  deployEnv: DeployEnv;
  websitePublicUrl: string;
  backofficePublicUrl: string;
  apiPublicUrl: string;
  ipc: ComplianceUrlItem[];
  compliance: ComplianceUrlItem[];
  all: ComplianceUrlItem[];
  submissionText: string;
}

export interface ComplianceUrlsHealthResponse {
  checkedAt: string;
  items: ComplianceUrlHealthItem[];
  allOk: boolean;
}

export interface PublicLegalUrls {
  website: string;
  cgu: string;
  cgv: string;
  privacy: string;
  pricing: string;
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

  getComplianceUrls(): Observable<ComplianceUrlsResponse> {
    return this.http.get<ComplianceUrlsResponse>(`${this.url}/compliance-urls`);
  }

  getComplianceUrlsHealth(): Observable<ComplianceUrlsHealthResponse> {
    return this.http.get<ComplianceUrlsHealthResponse>(`${this.url}/compliance-urls/health`);
  }

  getPublicLegalUrls(): Observable<PublicLegalUrls> {
    return this.http.get<PublicLegalUrls>(`${this.url}/public/legal-urls`);
  }
}

