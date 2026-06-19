import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import {
  SubscriptionService,
  Subscription,
  CreateSubscriptionDto,
  TargetType,
  SubscriptionFeature,
  SubscriptionStatusFilter,
} from '../../core/services/subscription.service';

@Component({
  selector: 'pdj-subscriptions',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './subscriptions.html',
  styleUrl: './subscriptions.scss',
})
export class Subscriptions implements OnInit {
  subscriptions: Subscription[] = [];
  loading = false;
  creating = false;
  createError = '';
  showCreateDialog = false;
  currentStep = 1;
  togglingId: string | null = null;
  toggleError = '';

  targetTypes = Object.values(TargetType);
  allFeatures = Object.values(SubscriptionFeature);
  targetFilter: string = '';
  statusFilter: SubscriptionStatusFilter = 'all';
  statusFilters: SubscriptionStatusFilter[] = ['all', 'active', 'inactive'];

  newSub: CreateSubscriptionDto = this.getEmptySubscription();

  get filteredSubscriptions(): Subscription[] {
    return this.subscriptions.filter((s) => {
      if (this.targetFilter && s.targetType !== this.targetFilter) return false;
      if (this.statusFilter === 'active') return s.isActive;
      if (this.statusFilter === 'inactive') return !s.isActive;
      return true;
    });
  }

  private baseForCounts(): Subscription[] {
    if (!this.targetFilter) return this.subscriptions;
    return this.subscriptions.filter(s => s.targetType === this.targetFilter);
  }

  constructor(
    private subscriptionService: SubscriptionService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadSubscriptions();
  }

  loadSubscriptions(): void {
    this.loading = true;
    this.toggleError = '';
    this.subscriptionService.findAllAdmin('all')
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          this.subscriptions = response.subscriptions;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load subscriptions:', err);
        },
      });
  }

  setStatusFilter(status: SubscriptionStatusFilter): void {
    this.statusFilter = status;
  }

  setTargetFilter(target: string): void {
    this.targetFilter = target;
  }

  toggleActive(sub: Subscription, event: Event): void {
    event.stopPropagation();
    this.togglingId = sub.id;
    this.toggleError = '';
    this.subscriptionService.setActive(sub.id, !sub.isActive)
      .pipe(finalize(() => {
        this.togglingId = null;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => this.loadSubscriptions(),
        error: (err) => {
          console.error('Failed to toggle subscription:', err);
          this.toggleError = err.error?.message || 'Impossible de modifier le statut.';
          this.cdr.detectChanges();
        },
      });
  }

  getCountByStatus(status: SubscriptionStatusFilter): number {
    const base = this.baseForCounts();
    if (status === 'all') return base.length;
    if (status === 'active') return base.filter(s => s.isActive).length;
    return base.filter(s => !s.isActive).length;
  }

  createSubscription(): void {
    this.creating = true;

    // Ensure numeric fields are actual numbers (ngModel can bind strings)
    const payload: CreateSubscriptionDto = {
      ...this.newSub,
      monthlyPrice: Number(this.newSub.monthlyPrice),
      maxMenusPerDay: Number(this.newSub.maxMenusPerDay),
      maxImagesPerDish: Number(this.newSub.maxImagesPerDish),
      maxProfilePhotos: Number(this.newSub.maxProfilePhotos),
      maxRestaurants: Number(this.newSub.maxRestaurants),
    };

    this.subscriptionService.create(payload)
      .pipe(finalize(() => {
        this.creating = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.closeDialog();
          this.loadSubscriptions();
        },
        error: (err) => {
          console.error('Failed to create subscription:', err);
          this.createError = err.error?.message || 'Une erreur est survenue lors de la création.';
          this.cdr.detectChanges();
        },
      });
  }

  isFeatureSelected(feature: SubscriptionFeature): boolean {
    return this.newSub.features?.includes(feature) ?? false;
  }

  toggleFeature(feature: SubscriptionFeature): void {
    if (!this.newSub.features) {
      this.newSub.features = [];
    }
    const index = this.newSub.features.indexOf(feature);
    if (index === -1) {
      this.newSub.features.push(feature);
    } else {
      this.newSub.features.splice(index, 1);
    }
  }

  getStep2Label(): string {
    if (this.newSub.targetType === TargetType.RESTAURANT) {
      return 'SUBSCRIPTIONS.STEP_LIMITS';
    }
    return 'SUBSCRIPTIONS.STEP_FEATURES';
  }

  getCountByTarget(targetType: string): number {
    return this.subscriptions.filter(s => s.targetType === targetType).length;
  }

  navigateToDetail(sub: Subscription): void {
    this.router.navigate(['/app/subscriptions', sub.id]);
  }

  closeDialog(): void {
    this.showCreateDialog = false;
    this.currentStep = 1;
    this.createError = '';
    this.newSub = this.getEmptySubscription();
  }

  private getEmptySubscription(): CreateSubscriptionDto {
    return {
      name: '',
      description: '',
      monthlyPrice: 0,
      targetType: '' as TargetType,
      features: [],
      maxMenusPerDay: 3,
      maxImagesPerDish: 1,
      maxProfilePhotos: 5,
      maxRestaurants: 1,
      accessMenusAndProfils: false,
      rechercheAndGeo: false,
      miniGames: false,
      hasAdvertisement: true,
      backOfficeComplet: false,
      idCardPremium: false,
      parrainageViaCode: false,
      participationTirages: false,
      isAllowedToBeItinerant: false,
      canHaveGift: false,
      isMultiRestaurant: false,
      isDefault: false,
    };
  }
}
