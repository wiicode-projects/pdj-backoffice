import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import {
  SubscriptionService,
  Subscription,
  SubscriptionPlan,
  CreatePlanDto,
  TargetType,
  BillingPeriod,
  Currency,
} from '../../../core/services/subscription.service';

@Component({
  selector: 'pdj-subscription-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './subscription-detail.html',
  styleUrl: './subscription-detail.scss',
})
export class SubscriptionDetail implements OnInit {
  subscription: Subscription | null = null;
  loading = true;
  creatingPlan = false;
  planError = '';
  showPlanDialog = false;
  subscriptionId = '';

  billingPeriods = Object.values(BillingPeriod);
  currencies = Object.values(Currency);

  newPlan: CreatePlanDto = this.getEmptyPlan();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private subscriptionService: SubscriptionService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.subscriptionId = this.route.snapshot.paramMap.get('id') || '';
    if (this.subscriptionId) {
      this.loadSubscription();
    }
  }

  loadSubscription(): void {
    this.loading = true;
    this.subscriptionService.findOne(this.subscriptionId)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          this.subscription = response.subscription;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load subscription:', err);
        },
      });
  }

  createPlan(): void {
    this.creatingPlan = true;
    const payload: CreatePlanDto = {
      ...this.newPlan,
      discount: Number(this.newPlan.discount),
      trialPeriodDays: Number(this.newPlan.trialPeriodDays),
    };

    this.subscriptionService.createPlan(this.subscriptionId, payload)
      .pipe(finalize(() => {
        this.creatingPlan = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.closePlanDialog();
          this.loadSubscription();
        },
        error: (err) => {
          console.error('Failed to create plan:', err);
          this.planError = err.error?.message || 'Une erreur est survenue lors de la création du plan.';
          this.cdr.detectChanges();
        },
      });
  }

  openPlanDialog(): void {
    this.showPlanDialog = true;
    this.planError = '';
    this.newPlan = this.getEmptyPlan();
  }

  closePlanDialog(): void {
    this.showPlanDialog = false;
    this.planError = '';
    this.newPlan = this.getEmptyPlan();
  }

  goBack(): void {
    this.router.navigate(['/app/subscriptions']);
  }

  isRestaurant(): boolean {
    return this.subscription?.targetType === TargetType.RESTAURANT;
  }

  private getEmptyPlan(): CreatePlanDto {
    return {
      discount: 0,
      trialPeriodDays: 14,
      billingPeriod: '' as BillingPeriod,
      currency: '' as Currency,
    };
  }
}
