import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

const CHECKOUT_STORAGE_KEY = 'pdj_membership_checkout';

export interface StoredCheckoutPayload {
  paymentId: string;
  returnToken: string;
  checkoutUrl: string;
  fields: Record<string, string>;
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
      if (!data.checkoutUrl || !data.fields) {
        throw new Error('Invalid checkout payload');
      }
      this.checkoutUrl = data.checkoutUrl;
      this.fieldEntries = Object.entries(data.fields).map(([key, value]) => ({
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
      this.checkoutForm?.nativeElement?.submit();
    });
  }

  goBack(): void {
    sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
    this.router.navigate(['/app/membership']);
  }
}

export function storeMembershipCheckout(payload: StoredCheckoutPayload): void {
  sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(payload));
}

export function clearMembershipCheckout(): void {
  sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
}
