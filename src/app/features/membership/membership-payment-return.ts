import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { PaymentService, PaymentStatus } from '../../core/services/payment.service';
import {
  clearMembershipCheckout,
  readStoredCheckout,
  resolvePaymentProviderLabel,
} from './membership-checkout';

type Outcome = 'loading' | 'confirmed' | 'failed' | 'cancelled' | 'timeout';

@Component({
  selector: 'pdj-membership-payment-return',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './membership-payment-return.html',
  styleUrl: './membership-payment-return.scss',
})
export class MembershipPaymentReturn implements OnInit, OnDestroy {
  paymentId = '';
  returnToken = '';
  paymentGateway = '';
  outcome: Outcome = 'loading';
  private pollSub?: Subscription;
  private pollTimer?: ReturnType<typeof setTimeout>;
  private pollAttempts = 0;
  private readonly maxPollAttempts = 30;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly paymentService: PaymentService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const stored = readStoredCheckout();
    this.paymentGateway = stored?.gateway ?? '';

    this.paymentId =
      this.route.snapshot.queryParamMap.get('paymentId') ?? stored?.paymentId ?? '';
    this.returnToken =
      this.route.snapshot.queryParamMap.get('token') ?? stored?.returnToken ?? '';
    const returnStatus = this.route.snapshot.queryParamMap.get('status');

    if (!this.paymentId) {
      this.outcome = 'failed';
      clearMembershipCheckout();
      return;
    }

    if (returnStatus === 'cancel') {
      this.outcome = 'cancelled';
      clearMembershipCheckout();
      return;
    }

    if (
      stored?.checkoutMode === 'redirect' &&
      stored.checkoutUrl &&
      returnStatus !== 'ok'
    ) {
      window.open(stored.checkoutUrl, '_blank', 'noopener,noreferrer');
    }

    clearMembershipCheckout();
    this.pollPaymentStatus();
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    if (this.pollTimer) clearTimeout(this.pollTimer);
  }

  goToMembership(): void {
    this.router.navigate(['/app/membership'], {
      queryParams: this.outcome === 'confirmed' ? { subscribed: '1' } : undefined,
    });
  }

  retryPayment(): void {
    this.router.navigate(['/app/membership']);
  }

  get providerLabel(): string {
    return resolvePaymentProviderLabel(this.paymentGateway);
  }

  private pollPaymentStatus(): void {
    const poll = (): void => {
      if (this.outcome !== 'loading') return;

      const request$ = this.returnToken
        ? this.paymentService.getReturnStatus(this.paymentId, this.returnToken)
        : this.paymentService.getStatus(this.paymentId);

      this.pollSub?.unsubscribe();
      this.pollSub = request$.subscribe({
        next: (res) => {
          if (res.payment.paymentGateway) {
            this.paymentGateway = res.payment.paymentGateway;
          }

          const status = res.payment.status as PaymentStatus;
          if (status === 'confirmed') {
            this.outcome = 'confirmed';
          } else if (status === 'failed') {
            this.outcome = 'failed';
          } else if (status === 'cancelled') {
            this.outcome = 'cancelled';
          }

          this.cdr.markForCheck();
          this.pollAttempts++;

          if (this.outcome === 'loading') {
            if (this.pollAttempts >= this.maxPollAttempts) {
              this.outcome = 'timeout';
              this.cdr.markForCheck();
            } else {
              this.pollTimer = setTimeout(poll, 2000);
            }
          }
        },
        error: () => {
          this.outcome = 'failed';
          this.cdr.markForCheck();
        },
      });
    };

    poll();
  }
}
