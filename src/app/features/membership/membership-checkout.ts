import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import type { CheckoutMode } from '../../core/services/payment.service';

const CHECKOUT_STORAGE_KEY = 'pdj_membership_checkout';

export interface StoredCheckoutPayload {
  paymentId: string;
  returnToken: string;
  checkoutUrl: string;
  fields: Record<string, string>;
  checkoutMode?: CheckoutMode;
  gateway?: string;
}

@Component({
  selector: 'pdj-membership-checkout',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './membership-checkout.html',
  styleUrl: './membership-checkout.scss',
})
export class MembershipCheckout implements OnInit, AfterViewInit {
  @ViewChild('checkoutForm') checkoutForm!: ElementRef<HTMLFormElement>;

  checkoutUrl = '';
  fieldEntries: { key: string; value: string }[] = [];
  checkoutMode: CheckoutMode = 'form_post';
  paymentGateway = 'mypos';
  loading = true;
  error = '';

  constructor(private readonly router: Router) {}

  ngOnInit(): void {
    const raw = sessionStorage.getItem(CHECKOUT_STORAGE_KEY);
    if (!raw) {
      this.router.navigate(['/app/membership']);
      return;
    }

    try {
      const data = JSON.parse(raw) as StoredCheckoutPayload;
      if (!data.checkoutUrl) {
        throw new Error('Invalid checkout payload');
      }
      this.checkoutUrl = data.checkoutUrl;
      this.checkoutMode = data.checkoutMode ?? 'form_post';
      this.paymentGateway = data.gateway ?? 'mypos';
      this.fieldEntries = Object.entries(data.fields ?? {}).map(([key, value]) => ({
        key,
        value: String(value),
      }));
    } catch {
      sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
      this.error = 'MEMBERSHIP.CHECKOUT_INVALID';
      this.loading = false;
    }
  }

  ngAfterViewInit(): void {
    if (this.error || !this.checkoutUrl) return;

    queueMicrotask(() => {
      if (this.checkoutMode === 'redirect') {
        this.router.navigate(['/app/membership']);
        return;
      }
      if (this.fieldEntries.length === 0) {
        window.location.href = this.checkoutUrl;
        return;
      }
      this.checkoutForm?.nativeElement?.submit();
    });
  }

  goBack(): void {
    sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
    this.router.navigate(['/app/membership']);
  }

  get providerLabel(): string {
    return resolvePaymentProviderLabel(this.paymentGateway);
  }
}

export function storeMembershipCheckout(payload: StoredCheckoutPayload): void {
  sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(payload));
}

export function clearMembershipCheckout(): void {
  sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
}

export function readStoredCheckout(): StoredCheckoutPayload | null {
  const raw = sessionStorage.getItem(CHECKOUT_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredCheckoutPayload;
  } catch {
    return null;
  }
}

export function readStoredCheckoutGateway(): string {
  return readStoredCheckout()?.gateway ?? '';
}

export function resolvePaymentProviderLabel(gateway: string): string {
  switch (gateway) {
    case 'paypal':
      return 'PayPal';
    case 'mypos':
      return 'myPOS';
    default:
      return gateway || 'PayPal / myPOS';
  }
}
