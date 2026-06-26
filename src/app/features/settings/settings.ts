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
  EmailProvider,
  ComplianceUrlHealthItem,
  ComplianceUrlsResponse,
} from '../../core/services/settings.service';
import { UserService, AdminUser } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { deployEnvLabel } from '../../core/constants/compliance-urls';

type Tab = 'general' | 'payment' | 'email' | 'notifications' | 'admins';

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

  // ── Payment: myPOS (Cartes + TWINT via même intégration) ─────────────
  myposEnabled = false;
  myposStoreId = '';
  myposConfigurationPack = '';
  myposTestMode = true;
  showMyposSecrets = false;

  // ── myPOS compliance URLs (from API) ───────────────────────────────
  complianceUrls: ComplianceUrlsResponse | null = null;
  complianceUrlsLoading = false;
  complianceUrlsError = '';
  complianceHealth: ComplianceUrlHealthItem[] = [];
  complianceHealthLoading = false;
  complianceHealthCheckedAt = '';
  complianceCopySuccess = false;

  get myposIpcUrls() {
    return this.complianceUrls?.ipc ?? [];
  }

  get myposComplianceUrls() {
    return this.complianceUrls?.compliance ?? [];
  }

  deployEnvLabel(env: string | undefined): string {
    if (env === 'development' || env === 'staging' || env === 'production') {
      return deployEnvLabel(env);
    }
    return 'Inconnu';
  }

  // ── Payment: PayPal ────────────────────────────────────────────────
  paypalEnabled = false;
  paypalClientId = '';
  paypalSecretKey = '';
  paypalWebhookUrl = '';
  paypalSandbox = true;
  showPaypalKey = false;

  // ── Payment: Virement bancaire ─────────────────────────────────────
  bankTransferEnabled = false;
  bankName = '';
  bankIban = '';
  bankBic = '';
  bankAccountHolder = '';
  bankReference = '';

  // ── Email ──────────────────────────────────────────────────────────
  emailEnabled = true;
  emailProvider: EmailProvider = 'brevo';
  brevoEnabled = true;
  brevoApiKey = '';
  showBrevoKey = false;
  kreativMediaEnabled = false;
  kreativMediaSmtpHost = '';
  kreativMediaSmtpPort = 465;
  kreativMediaSmtpUser = '';
  kreativMediaSmtpPassword = '';
  showKreativPassword = false;
  kreativMediaSmtpSecure = true;

  emailOtpEnabled = true;
  emailWelcomeEnabled = true;
  emailPasswordResetEnabled = true;
  emailInvoiceEnabled = true;
  emailSubscriptionEnabled = true;

  // ── Admins ───────────────────────────────────────────────────────────
  adminsLoading = false;
  adminsSaving = false;
  admins: AdminUser[] = [];
  adminsError = '';
  adminsSuccess = '';
  showCreateAdminForm = false;
  resetSendingId: string | null = null;
  confirmDeleteAdminId: string | null = null;
  deletingAdmin = false;
  adminForm = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    sendResetEmail: true,
  };

  /** Visual badge: shows a warning dot on the email tab if active provider is misconfigured */
  get emailMissingConfig(): boolean {
    if (!this.emailEnabled) return false;
    if (this.emailProvider === 'brevo') {
      return this.brevoEnabled && !this.brevoApiKey.trim();
    }
    return (
      this.kreativMediaEnabled &&
      (!this.kreativMediaSmtpHost.trim() ||
        !this.kreativMediaSmtpUser.trim() ||
        !this.kreativMediaSmtpPassword.trim())
    );
  }

  readonly tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'general',       label: 'Général',      icon: 'general'  },
    { id: 'payment',       label: 'Paiements',     icon: 'payment'  },
    { id: 'email',         label: 'E-mails',       icon: 'email'    },
    { id: 'notifications', label: 'Notifications', icon: 'bell'     },
    { id: 'admins',        label: 'Administrateurs', icon: 'admins' },
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
    private userService: UserService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
    this.loadComplianceUrls();
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
    // myPOS — single gateway (TWINT included via myPOS contract, not a separate integration)
    this.myposEnabled = (data?.myposEnabled ?? false) || (data?.twintEnabled ?? false);
    this.myposStoreId = data?.myposMerchantId ?? '';
    this.myposConfigurationPack = data?.myposApiKey ?? '';
    this.myposTestMode = data?.myposTestMode ?? true;
    // Payment: PayPal
    this.paypalEnabled     = data?.paypalEnabled   ?? false;
    this.paypalClientId    = data?.paypalClientId   ?? '';
    this.paypalSecretKey   = data?.paypalSecretKey   ?? '';
    this.paypalWebhookUrl  = data?.paypalWebhookUrl  ?? '';
    this.paypalSandbox     = data?.paypalSandbox     ?? true;
    // Payment: Bank transfer
    this.bankTransferEnabled = data?.bankTransferEnabled ?? false;
    this.bankName            = data?.bankName           ?? '';
    this.bankIban            = data?.bankIban            ?? '';
    this.bankBic             = data?.bankBic             ?? '';
    this.bankAccountHolder   = data?.bankAccountHolder   ?? '';
    this.bankReference       = data?.bankReference       ?? '';
    // Email
    this.emailEnabled               = data?.emailEnabled               ?? true;
    this.emailProvider              = data?.emailProvider              ?? 'brevo';
    this.brevoEnabled               = data?.brevoEnabled               ?? true;
    this.brevoApiKey                = data?.brevoApiKey                ?? '';
    this.kreativMediaEnabled        = data?.kreativMediaEnabled        ?? false;
    this.kreativMediaSmtpHost       = data?.kreativMediaSmtpHost       ?? '';
    this.kreativMediaSmtpPort       = data?.kreativMediaSmtpPort       ?? 465;
    this.kreativMediaSmtpUser       = data?.kreativMediaSmtpUser       ?? '';
    this.kreativMediaSmtpPassword   = data?.kreativMediaSmtpPassword   ?? '';
    this.kreativMediaSmtpSecure     = data?.kreativMediaSmtpSecure     ?? true;
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
    this.adminsError = '';
    this.adminsSuccess = '';
    if (tab === 'payment' && !this.complianceUrls && !this.complianceUrlsLoading) {
      this.loadComplianceUrls();
    }
    if (tab === 'admins') {
      this.loadAdmins();
    }
  }

  loadComplianceUrls(): void {
    this.complianceUrlsLoading = true;
    this.complianceUrlsError = '';
    this.settingsService.getComplianceUrls()
      .pipe(finalize(() => { this.complianceUrlsLoading = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (data) => { this.complianceUrls = data; },
        error: (err) => {
          this.complianceUrlsError = err?.error?.message ?? 'Impossible de charger les URLs de conformité.';
        },
      });
  }

  checkComplianceHealth(): void {
    this.complianceHealthLoading = true;
    this.settingsService.getComplianceUrlsHealth()
      .pipe(finalize(() => { this.complianceHealthLoading = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (data) => {
          this.complianceHealth = data.items;
          this.complianceHealthCheckedAt = data.checkedAt;
        },
        error: (err) => {
          this.complianceUrlsError = err?.error?.message ?? 'Impossible de vérifier les URLs.';
        },
      });
  }

  getUrlHealth(url: string): ComplianceUrlHealthItem | undefined {
    return this.complianceHealth.find((item) => item.url === url);
  }

  copyComplianceSubmission(): void {
    const text = this.complianceUrls?.submissionText;
    if (!text) return;
    this.copyToClipboard(text);
    this.complianceCopySuccess = true;
    setTimeout(() => { this.complianceCopySuccess = false; this.cdr.detectChanges(); }, 2500);
  }

  loadAdmins(): void {
    this.adminsLoading = true;
    this.adminsError = '';
    this.userService.findAllAdmins()
      .pipe(finalize(() => { this.adminsLoading = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (res) => { this.admins = res.admins ?? []; },
        error: (err) => { this.adminsError = err?.error?.message ?? 'Impossible de charger les administrateurs.'; },
      });
  }

  toggleCreateAdminForm(): void {
    this.showCreateAdminForm = !this.showCreateAdminForm;
    this.adminsError = '';
    this.adminsSuccess = '';
  }

  createAdmin(): void {
    if (!this.adminForm.firstName.trim() || !this.adminForm.lastName.trim() || !this.adminForm.email.trim()) {
      this.adminsError = 'Veuillez remplir le prénom, le nom et l\'e-mail.';
      return;
    }

    this.adminsSaving = true;
    this.adminsError = '';
    this.adminsSuccess = '';

    this.userService.createAdmin({
      firstName: this.adminForm.firstName.trim(),
      lastName: this.adminForm.lastName.trim(),
      email: this.adminForm.email.trim(),
      phone: this.adminForm.phone.trim() || undefined,
      sendResetEmail: this.adminForm.sendResetEmail,
    })
      .pipe(finalize(() => { this.adminsSaving = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (res) => {
          this.adminsSuccess = res.resetEmailSent
            ? 'Administrateur créé. Un e-mail de réinitialisation a été envoyé.'
            : 'Administrateur créé avec succès.';
          this.adminForm = { firstName: '', lastName: '', email: '', phone: '', sendResetEmail: true };
          this.showCreateAdminForm = false;
          this.loadAdmins();
          setTimeout(() => { this.adminsSuccess = ''; this.cdr.detectChanges(); }, 4000);
        },
        error: (err) => {
          this.adminsError = err?.error?.message ?? 'Impossible de créer l\'administrateur.';
        },
      });
  }

  sendPasswordReset(admin: AdminUser): void {
    this.resetSendingId = admin.id;
    this.adminsError = '';
    this.adminsSuccess = '';

    this.userService.sendAdminPasswordReset(admin.id)
      .pipe(finalize(() => { this.resetSendingId = null; this.cdr.detectChanges(); }))
      .subscribe({
        next: () => {
          this.adminsSuccess = `E-mail de réinitialisation envoyé à ${admin.email}.`;
          setTimeout(() => { this.adminsSuccess = ''; this.cdr.detectChanges(); }, 4000);
        },
        error: (err) => {
          this.adminsError = err?.error?.message ?? 'Impossible d\'envoyer l\'e-mail.';
        },
      });
  }

  isCurrentAdmin(admin: AdminUser): boolean {
    return admin.id === this.authService.user()?.id;
  }

  adminDisplayName(admin: AdminUser): string {
    const name = [admin.firstName, admin.lastName].filter(Boolean).join(' ').trim();
    return name || admin.email;
  }

  askDeleteAdmin(admin: AdminUser): void {
    this.confirmDeleteAdminId = admin.id;
    this.adminsError = '';
    this.adminsSuccess = '';
  }

  cancelDeleteAdmin(): void {
    this.confirmDeleteAdminId = null;
  }

  confirmDeleteAdmin(id: string): void {
    this.deletingAdmin = true;
    this.adminsError = '';
    this.adminsSuccess = '';

    this.userService.removeAdmin(id)
      .pipe(finalize(() => {
        this.deletingAdmin = false;
        this.confirmDeleteAdminId = null;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.admins = this.admins.filter((admin) => admin.id !== id);
          this.adminsSuccess = 'Administrateur supprimé.';
          setTimeout(() => { this.adminsSuccess = ''; this.cdr.detectChanges(); }, 4000);
        },
        error: (err) => {
          this.adminsError = err?.error?.message ?? 'Impossible de supprimer l\'administrateur.';
        },
      });
  }

  saveGeneral(): void {
    this.doSave(this.settingsService.updateGeneral(this.generalForm));
  }

  savePayment(): void {
    const dto: UpdatePaymentSettingsDto = {
      // myPOS — TWINT is enabled through the same myPOS checkout (no separate credentials)
      myposEnabled: this.myposEnabled,
      myposMerchantId: this.myposStoreId.trim() || undefined,
      myposApiKey: this.myposConfigurationPack.trim() || undefined,
      myposTestMode: this.myposTestMode,
      myposWebhookUrl: this.complianceUrls?.ipc[0]?.url ?? this.myposIpcUrls[0]?.url,
      twintEnabled: this.myposEnabled,
      twintWebhookUrl: '',
      twintMerchantId: '',
      twintApiKey: '',
      // PayPal
      paypalEnabled: this.paypalEnabled, paypalClientId: this.paypalClientId,
      paypalSecretKey: this.paypalSecretKey, paypalWebhookUrl: this.paypalWebhookUrl,
      paypalSandbox: this.paypalSandbox,
      // Bank transfer
      bankTransferEnabled: this.bankTransferEnabled, bankName: this.bankName,
      bankIban: this.bankIban, bankBic: this.bankBic,
      bankAccountHolder: this.bankAccountHolder, bankReference: this.bankReference,
    };
    this.doSave(this.settingsService.updatePayment(dto));
  }

  saveEmail(): void {
    const dto: UpdateEmailSettingsDto = {
      emailProvider:             this.emailProvider,
      brevoEnabled:              this.brevoEnabled,
      brevoApiKey:               this.brevoApiKey,
      kreativMediaEnabled:       this.kreativMediaEnabled,
      kreativMediaSmtpHost:      this.kreativMediaSmtpHost,
      kreativMediaSmtpPort:      this.kreativMediaSmtpPort,
      kreativMediaSmtpUser:      this.kreativMediaSmtpUser,
      kreativMediaSmtpPassword:  this.kreativMediaSmtpPassword,
      kreativMediaSmtpSecure:    this.kreativMediaSmtpSecure,
      emailEnabled:              this.emailEnabled,
      emailOtpEnabled:           this.emailOtpEnabled,
      emailWelcomeEnabled:       this.emailWelcomeEnabled,
      emailPasswordResetEnabled: this.emailPasswordResetEnabled,
      emailInvoiceEnabled:       this.emailInvoiceEnabled,
      emailSubscriptionEnabled:  this.emailSubscriptionEnabled,
    };
    this.doSave(this.settingsService.updateEmail(dto));
  }

  selectEmailProvider(provider: EmailProvider): void {
    this.emailProvider = provider;
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
    if (!value) return;
    navigator.clipboard.writeText(value).catch(() => {});
  }

  getToggleValue(key: string): boolean {
    return (this as any)[key] as boolean;
  }

  setToggleValue(key: string, val: boolean): void {
    (this as any)[key] = val;
  }
}

