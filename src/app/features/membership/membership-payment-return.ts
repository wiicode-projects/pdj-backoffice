import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { EMPTY, Subscription, timer } from 'rxjs';
import { catchError, switchMap, take, takeWhile, tap } from 'rxjs/operators';
import { PaymentService, PaymentStatus } from '../../core/services/payment.service';
import { clearMembershipCheckout } from './membership-checkout';

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
  outcome: Outcome = 'loading';
  private pollSub?: Subscription;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly paymentService: PaymentService,
  ) {}

  ngOnInit(): void {
    clearMembershipCheckout();

    this.paymentId = this.route.snapshot.queryParamMap.get('paymentId') ?? '';
    this.returnToken = this.route.snapshot.queryParamMap.get('token') ?? '';
    const returnStatus = this.route.snapshot.queryParamMap.get('status');

    if (!this.paymentId) {
      this.outcome = 'failed';
      return;
    }

    if (returnStatus === 'cancel') {
      this.outcome = 'cancelled';
      return;
    }

    this.pollPaymentStatus();
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  goToMembership(): void {
    this.router.navigate(['/app/membership'], {
      queryParams: this.outcome === 'confirmed' ? { subscribed: '1' } : undefined,
    });
  }

  retryPayment(): void {
    this.router.navigate(['/app/membership']);
  }

  private pollPaymentStatus(): void {
    this.pollSub = timer(0, 2000)
      .pipe(
        take(30),
        takeWhile(() => this.outcome === 'loading', true),
        switchMap(() => {
          if (this.outcome !== 'loading') return EMPTY;

          const request$ = this.returnToken
            ? this.paymentService.getReturnStatus(this.paymentId, this.returnToken)
            : this.paymentService.getStatus(this.paymentId);

          return request$.pipe(
            catchError(() => {
              this.outcome = 'failed';
              return EMPTY;
            }),
          );
        }),
        tap((res) => {
          const status = res.payment.status as PaymentStatus;
          if (status === 'confirmed') {
            this.outcome = 'confirmed';
          } else if (status === 'failed') {
            this.outcome = 'failed';
          } else if (status === 'cancelled') {
            this.outcome = 'cancelled';
          }
        }),
      )
      .subscribe({
        complete: () => {
          if (this.outcome === 'loading') {
            this.outcome = 'timeout';
          }
        },
      });
  }
}
