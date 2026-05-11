import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  SettingsService,
  PlatformSettings,
  UpdatePaymentSettingsDto,
  UpdateGeneralSettingsDto,
  UpdateEmailSettingsDto,
} from '../../core/services/settings.service';

type Tab = 'general' | 'payment' | 'email' | 'notifications';

@Component({
  selector: 'pdj-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings implements OnInit {
  activeTab: Tab = 'payment';
  loading = true;
  saving = false;
  saveSuccess = false;
  saveError = '';

  settings: PlatformSettings | null = null;

  // ── General ────────────────────────────────────────────────────────────
  generalForm: UpdateGeneralSettingsDto = {
    platformName: '',
    supportEmail: '',
    supportPhone: '',
  };

  // ── Payment ────────────────────────────────────────────────────────────
  twintEnabled = false;
  twintWebhookUrl = '';
  twintMerchantId = '';
  twintApiKey = '';
  showTwintKey = false;

  myposEnabled = false;
  myposWebhookUrl = '';
  myposMerchantId = '';
  myposApiKey = '';
  showMyposKey = false;

  // ── Email ──────────────────────────────────────────────────────────────
  emailEnabled = true;
  brevoApiKey = '';
  showBrevoKey = false;
  emailSenderName = '';
  emailSenderAddress = '';

  emailOtpEnabled = true;
  emailWelcomeEnabled = true;
  emailPasswordResetEnabled = true;
  emailInvoiceEnabled = true;
  emailSubscriptionEnabled = true;

  /** Visual badge: shows a warning dot on the email tab if Brevo key is missing */
  get emailMissingConfig(): boolean {
    return this.emailEnabled && !this.brevoApiKey;
  }

  readonly tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'general',       label: 'Général',      icon: 'general'  },
    { id: 'payment',       label: 'Paiements',     icon: 'payment'  },
    { id: 'email',         label: 'E-mails',       icon: 'email'    },
    { id: 'notifications', label: 'Notifications', icon: 'bell'     },
  ];

  readonly emailToggleRows: { key: keyof Settings; label: string; desc: string; type: string }[] = [
    { key: 'emailOtpEnabled',           label: 'Code OTP / 2FA',          desc: 'E-mail de vérification envoyé à la connexion',          type: 'otp'            },
    { key: 'emailWelcomeEnabled',       label: 'Bienvenue',                desc: 'E-mail envoyé lors d\'une nouvelle inscription',         type: 'welcome'        },
    { key: 'emailPasswordResetEnabled', label: 'Réinitialisation mot de passe', desc: 'Lien de réinitialisation sécurisé',                type: 'password_reset' },
    { key: 'emailInvoiceEnabled',       label: 'Facturation',              desc: 'Notifications de factures et reçus',                    type: 'invoice'        },
    { key: 'emailSubscriptionEnabled',  label: 'Abonnements',              desc: 'Rappels d\'expiration et renouvellements',              type: 'subscription'   },
  ];

  constructor(
    private settingsService: SettingsService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.settingsService.getSettings()
      .pipe(finalize(() => { this.loading = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (data) => { this.settings = data; this.patchForms(data); },
        error: ()     => { this.patchForms(null); },
      });
  }

  private patchForms(data: PlatformSettings | null): void {
    this.generalForm = {
      platformName: data?.platformName ?? 'Plat du Jour',
      supportEmail: data?.supportEmail ?? '',
      supportPhone: data?.supportPhone ?? '',
    };
    // Payment
    this.twintEnabled    = data?.twintEnabled    ?? false;
    this.twintWebhookUrl = data?.twintWebhookUrl ?? '';
    this.twintMerchantId = data?.twintMerchantId ?? '';
    this.twintApiKey     = data?.twintApiKey     ?? '';
    this.myposEnabled    = data?.myposEnabled    ?? false;
    this.myposWebhookUrl = data?.myposWebhookUrl ?? '';
    this.myposMerchantId = data?.myposMerchantId ?? '';
    this.myposApiKey     = data?.myposApiKey     ?? '';
    // Email
    this.emailEnabled               = data?.emailEnabled               ?? true;
    this.brevoApiKey                = data?.brevoApiKey                ?? '';
    this.emailSenderName            = data?.emailSenderName            ?? 'Plat du Jour';
    this.emailSenderAddress         = data?.emailSenderAddress         ?? 'contact@caytout.com';
    this.emailOtpEnabled            = data?.emailOtpEnabled            ?? true;
    this.emailWelcomeEnabled        = data?.emailWelcomeEnabled        ?? true;
    this.emailPasswordResetEnabled  = data?.emailPasswordResetEnabled  ?? true;
    this.emailInvoiceEnabled        = data?.emailInvoiceEnabled        ?? true;
    this.emailSubscriptionEnabled   = data?.emailSubscriptionEnabled   ?? true;
  }

  setTab(tab: Tab): void {
    this.activeTab = tab;
    this.saveSuccess = false;
    this.saveError = '';
  }

  saveGeneral(): void {
    this.doSave(this.settingsService.updateGeneral(this.generalForm));
  }

  savePayment(): void {
    const dto: UpdatePaymentSettingsDto = {
      twintEnabled: this.twintEnabled, twintWebhookUrl: this.twintWebhookUrl,
      twintMerchantId: this.twintMerchantId, twintApiKey: this.twintApiKey,
      myposEnabled: this.myposEnabled, myposWebhookUrl: this.myposWebhookUrl,
      myposMerchantId: this.myposMerchantId, myposApiKey: this.myposApiKey,
    };
    this.doSave(this.settingsService.updatePayment(dto));
  }

  saveEmail(): void {
    const dto: UpdateEmailSettingsDto = {
      brevoApiKey:               this.brevoApiKey,
      emailSenderName:           this.emailSenderName,
      emailSenderAddress:        this.emailSenderAddress,
      emailEnabled:              this.emailEnabled,
      emailOtpEnabled:           this.emailOtpEnabled,
      emailWelcomeEnabled:       this.emailWelcomeEnabled,
      emailPasswordResetEnabled: this.emailPasswordResetEnabled,
      emailInvoiceEnabled:       this.emailInvoiceEnabled,
      emailSubscriptionEnabled:  this.emailSubscriptionEnabled,
    };
    this.doSave(this.settingsService.updateEmail(dto));
  }

  private doSave(obs: any): void {
    this.saving = true;
    this.saveSuccess = false;
    this.saveError = '';
    obs.pipe(finalize(() => { this.saving = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (data: PlatformSettings) => {
          this.settings = data;
          this.patchForms(data);
          this.saveSuccess = true;
          setTimeout(() => { this.saveSuccess = false; this.cdr.detectChanges(); }, 3000);
        },
        error: (err: any) => {
          this.saveError = err?.error?.message ?? 'Une erreur est survenue';
        },
      });
  }

  copyToClipboard(value: string): void {
    navigator.clipboard.writeText(value).catch(() => {});
  }

  getToggleValue(key: string): boolean {
    return (this as any)[key] as boolean;
  }

  setToggleValue(key: string, val: boolean): void {
    (this as any)[key] = val;
  }
}

