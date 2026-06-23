import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { PaymentService } from '../../core/services/payment.service';
import { SettingsService, PublicLegalUrls } from '../../core/services/settings.service';
import { resolveFallbackLegalUrls } from '../../core/constants/compliance-urls';
import { storeMembershipCheckout } from './membership-checkout';
import { environment } from '../../../environments/environment';

interface MembershipData {
  id: string;
  isActive: boolean;
  status: string;
  startingAt: string;
  endingAt: string | null;
  subscription: {
    id: string;
    name: string;
    description: string | null;
    targetType: string;
    price: number;
  } | null;
  plan: {
    id: string;
    price: number;
    period: string;
    billingPeriod: string;
    discount: number | null;
  } | null;
}

interface Invoice {
  id: string;
  amount: number;
  status: string;
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
}

interface Plan {
  id: string;
  billingPeriod: string;
  currency: string;
  discount: number | null;
}

interface AvailableSubscription {
  id: string;
  name: string;
  description: string | null;
  price: number;
  color: string | null;
  isDefault: boolean;
  targetType: string;
  features: string[] | null;
  maxMenusPerDay: number | null;
  maxImagesPerDish: number | null;
  maxProfilePhotos: number | null;
  maxRestaurants: number | null;
  accessMenusAndProfils: boolean;
  rechercheAndGeo: boolean;
  miniGames: boolean;
  hasAdvertisement: boolean;
  backOfficeComplet: boolean;
  idCardPremium: boolean;
  parrainageViaCode: boolean;
  participationTirages: boolean;
  isAllowedToBeItinerant: boolean;
  canHaveGift: boolean;
  isMultiRestaurant: boolean;
  plans: Plan[] | null;
}

@Component({
  selector: 'pdj-membership',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './membership.html',
  styleUrl: './membership.scss',
})
export class Membership implements OnInit {
  membership: MembershipData | null = null;
  invoices: Invoice[] = [];
  subscriptions: AvailableSubscription[] = [];
  loading = false;
  invoicesLoading = false;
  subscriptionsLoading = false;

  // Subscribe flow
  selectedSubscription: AvailableSubscription | null = null;
  selectedPlanId: string | null = null;
  subscribing = false;
  subscribeSuccess = false;
  subscribeError = '';
  acceptCgv = false;
  paymentAvailable = true;
  paymentAvailabilityLoading = true;
  legalUrls: PublicLegalUrls = { ...resolveFallbackLegalUrls() };

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
    private paymentService: PaymentService,
    private settingsService: SettingsService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('subscribed') === '1') {
      this.subscribeSuccess = true;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true,
      });
    }
    this.loadMembership();
    this.loadInvoices();
    this.loadSubscriptions();
    this.loadPaymentAvailability();
    this.settingsService.getPublicLegalUrls().subscribe({
      next: (urls) => {
        this.legalUrls = urls;
        this.cdr.detectChanges();
      },
    });
  }

  get paymentUnavailable(): boolean {
    return !this.paymentAvailabilityLoading && !this.paymentAvailable;
  }

  private loadPaymentAvailability(): void {
    this.paymentAvailabilityLoading = true;
    this.paymentService.getAvailability()
      .pipe(finalize(() => {
        this.paymentAvailabilityLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res) => {
          this.paymentAvailable = res.mypos.enabled && res.mypos.configured;
        },
        error: () => {
          this.paymentAvailable = false;
        },
      });
  }

  get restaurantId(): string | null {
    return this.authService.user()?.restaurant?.id || null;
  }

  // ── Data loading ─────────────────────────────────────────────────────────────

  loadMembership(): void {
    const id = this.restaurantId;
    if (!id) return;

    this.loading = true;
    this.http.get<{ status: number; membership: MembershipData }>(
      `${environment.apiUrl}/restaurants/${id}/subscriptions/active`
    )
    .pipe(finalize(() => {
      this.loading = false;
      this.cdr.detectChanges();
    }))
    .subscribe({
      next: (res) => {
        this.membership = res.membership;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load membership:', err);
      },
    });
  }

  loadInvoices(): void {
    const id = this.restaurantId;
    if (!id) return;

    this.invoicesLoading = true;
    this.http.get<{ invoices: Invoice[] }>(
      `${environment.apiUrl}/restaurants/${id}/invoices`
    )
    .pipe(finalize(() => {
      this.invoicesLoading = false;
      this.cdr.detectChanges();
    }))
    .subscribe({
      next: (res) => {
        this.invoices = res.invoices || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load invoices:', err);
      },
    });
  }

  loadSubscriptions(): void {
    this.subscriptionsLoading = true;
    this.http.get<{ status: number; subscriptions: AvailableSubscription[] }>(
      `${environment.apiUrl}/subscriptions?targetType=RESTAURANT`
    )
    .pipe(finalize(() => {
      this.subscriptionsLoading = false;
      this.cdr.detectChanges();
    }))
    .subscribe({
      next: (res) => {
        this.subscriptions = res.subscriptions || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load subscriptions:', err);
      },
    });
  }

  // ── Subscribe flow ───────────────────────────────────────────────────────────

  selectSubscription(sub: AvailableSubscription): void {
    this.selectedSubscription = sub;
    this.selectedPlanId = sub.plans?.[0]?.id || null;
    this.subscribeError = '';
    this.subscribeSuccess = false;
    this.acceptCgv = false;
  }

  closePlanModal(): void {
    this.selectedSubscription = null;
    this.selectedPlanId = null;
    this.subscribeError = '';
    this.subscribeSuccess = false;
    this.acceptCgv = false;
  }

  selectPlan(planId: string): void {
    this.selectedPlanId = planId;
  }

  subscribe(): void {
    const id = this.restaurantId;
    if (!id || !this.selectedSubscription) return;

    if (this.requiresPayment(this.selectedSubscription, this.selectedPlanId)) {
      if (!this.selectedPlanId) return;
      if (!this.acceptCgv) {
        this.subscribeError = this.translate.instant('MEMBERSHIP.CGV_REQUIRED');
        return;
      }
      if (!this.paymentAvailable) {
        this.subscribeError = this.translate.instant('MEMBERSHIP.PAYMENT_UNAVAILABLE');
        return;
      }
      this.startPaidCheckout(id);
      return;
    }

    this.subscribeDirect(id);
  }

  get modalSubscribeDisabled(): boolean {
    if (this.subscribing) return true;
    if (!this.selectedPlanId && !this.selectedSubscription?.isDefault) return true;
    if (
      this.selectedSubscription &&
      this.requiresPayment(this.selectedSubscription, this.selectedPlanId) &&
      !this.acceptCgv
    ) {
      return true;
    }
    return false;
  }

  get selectedPlanRequiresPayment(): boolean {
    if (!this.selectedSubscription) return false;
    return this.requiresPayment(this.selectedSubscription, this.selectedPlanId);
  }

  private requiresPayment(sub: AvailableSubscription, planId: string | null): boolean {
    if (sub.isDefault) return false;
    if (!planId) return false;
    const plan = sub.plans?.find((p) => p.id === planId);
    if (!plan) return false;
    return this.getPlanPrice(plan, sub) > 0;
  }

  private subscribeDirect(restaurantId: string): void {
    const body: { subscriptionId: string; subscriptionPlanId?: string } = {
      subscriptionId: this.selectedSubscription!.id,
    };
    if (this.selectedPlanId) {
      body.subscriptionPlanId = this.selectedPlanId;
    }

    this.subscribing = true;
    this.subscribeError = '';

    this.http.post(
      `${environment.apiUrl}/restaurants/${restaurantId}/subscriptions`,
      body,
    )
    .pipe(finalize(() => {
      this.subscribing = false;
      this.cdr.detectChanges();
    }))
    .subscribe({
      next: () => {
        this.subscribeSuccess = true;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.closePlanModal();
          this.loadMembership();
          this.loadInvoices();
        }, 1500);
      },
      error: (err) => {
        if (err?.status === 402) {
          this.startPaidCheckout(restaurantId);
          return;
        }
        this.subscribeError = this.extractErrorMessage(err);
        console.error('Subscribe error:', err);
      },
    });
  }

  private startPaidCheckout(restaurantId: string): void {
    if (!this.selectedSubscription || !this.selectedPlanId) return;

    this.subscribing = true;
    this.subscribeError = '';

    this.paymentService.createRestaurantCheckout({
      subscriptionId: this.selectedSubscription.id,
      subscriptionPlanId: this.selectedPlanId,
      restaurantId,
    })
    .pipe(finalize(() => {
      this.subscribing = false;
      this.cdr.detectChanges();
    }))
    .subscribe({
      next: (res) => {
        storeMembershipCheckout({
          paymentId: res.payment.id,
          returnToken: res.returnToken,
          checkoutUrl: res.checkoutUrl,
          fields: res.fields,
        });
        this.closePlanModal();
        this.router.navigate(['/app/membership/checkout']);
      },
      error: (err) => {
        this.subscribeError = this.extractErrorMessage(err);
        console.error('Checkout error:', err);
      },
    });
  }

  private extractErrorMessage(err: { error?: { message?: string | { message?: string } }; message?: string }): string {
    const msg = err?.error?.message;
    if (typeof msg === 'string') return msg;
    if (msg && typeof msg === 'object' && typeof msg.message === 'string') return msg.message;
    return err?.message || 'An error occurred';
  }

  get subscribeButtonKey(): string {
    if (!this.selectedSubscription) return 'MEMBERSHIP.SUBSCRIBE';
    return this.requiresPayment(this.selectedSubscription, this.selectedPlanId)
      ? 'MEMBERSHIP.PROCEED_TO_PAYMENT'
      : 'MEMBERSHIP.SUBSCRIBE';
  }

  isCurrentSubscription(subId: string): boolean {
    return this.membership?.subscription?.id === subId;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  formatDate(date: string | null): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-CH', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  formatPrice(amount: number): string {
    return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(amount);
  }

  getPeriodLabel(period: string): string {
    const map: Record<string, string> = {
      MONTHLY: 'MEMBERSHIP.PERIOD.MONTHLY',
      QUARTERLY: 'MEMBERSHIP.PERIOD.QUARTERLY',
      SEMI_ANNUALLY: 'MEMBERSHIP.PERIOD.SEMI_ANNUALLY',
      YEARLY: 'MEMBERSHIP.PERIOD.YEARLY',
    };
    return map[period] || period;
  }

  getPeriodShortLabel(period: string): string {
    const map: Record<string, string> = {
      MONTHLY: '/mois',
      QUARTERLY: '/trim.',
      SEMI_ANNUALLY: '/sem.',
      YEARLY: '/an',
    };
    return map[period] || '';
  }

  getInvoiceStatusClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PAID': return 'status--paid';
      case 'PENDING': return 'status--pending';
      case 'OVERDUE': return 'status--overdue';
      default: return '';
    }
  }

  get membershipPrice(): number {
    // The plan entity doesn't have a price; the price is on the subscription
    if (this.membership?.subscription) {
      return this.membership.subscription.price || 0;
    }
    return 0;
  }

  get daysRemaining(): number | null {
    if (!this.membership?.endingAt) return null;
    const end = new Date(this.membership.endingAt).getTime();
    const now = Date.now();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }

  getSubColor(sub: AvailableSubscription): string {
    return sub.color || '#DC2626';
  }

  getFeatureList(sub: AvailableSubscription): { label: string; enabled: boolean }[] {
    const features: { label: string; enabled: boolean }[] = [];
    if (sub.maxMenusPerDay != null)
      features.push({ label: `${sub.maxMenusPerDay} menus / jour`, enabled: true });
    if (sub.maxImagesPerDish != null)
      features.push({ label: `${sub.maxImagesPerDish} images / plat`, enabled: true });
    if (sub.maxProfilePhotos != null)
      features.push({ label: `${sub.maxProfilePhotos} photos profil`, enabled: true });
    features.push({ label: 'Back-office complet', enabled: sub.backOfficeComplet });
    features.push({ label: 'Sans publicités', enabled: !sub.hasAdvertisement });
    features.push({ label: 'Restaurant itinérant', enabled: sub.isAllowedToBeItinerant });
    features.push({ label: 'Cadeaux', enabled: sub.canHaveGift });
    features.push({ label: 'Multi-restaurant', enabled: sub.isMultiRestaurant });
    return features;
  }

  getPlanPrice(plan: Plan, sub: AvailableSubscription): number {
    const base = sub.price || 0;
    const multiplier: Record<string, number> = {
      MONTHLY: 1,
      QUARTERLY: 3,
      SEMI_ANNUALLY: 6,
      YEARLY: 12,
    };
    const months = multiplier[plan.billingPeriod] || 1;
    const total = base * months;
    if (plan.discount) {
      return total - (total * plan.discount / 100);
    }
    return total;
  }
}
