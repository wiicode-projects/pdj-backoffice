import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import {
  SubscriptionService,
  Subscription,
  TargetType,
} from '../../../core/services/subscription.service';

@Component({
  selector: 'pdj-subscription-detail',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './subscription-detail.html',
  styleUrl: './subscription-detail.scss',
})
export class SubscriptionDetail implements OnInit {
  subscription: Subscription | null = null;
  loading = true;
  subscriptionId = '';

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

  goBack(): void {
    this.router.navigate(['/app/subscriptions']);
  }

  isRestaurant(): boolean {
    return this.subscription?.targetType === TargetType.RESTAURANT;
  }
}
