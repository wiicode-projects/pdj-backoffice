import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import {
  SubscriptionService,
  Subscription,
  SubscriptionPlan,
  CreateSubscriptionDto,
  CreatePlanDto,
  TargetType,
  BillingPeriod,
  Currency,
  SubscriptionFeature,
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
  subscriptionId = '';

  // Plan dialog
  creatingPlan = false;
  planError = '';
  showPlanDialog = false;
  billingPeriods = Object.values(BillingPeriod);
  currencies = Object.values(Currency);
  newPlan: CreatePlanDto = this.getEmptyPlan();

  // Edit dialog
  showEditDialog = false;
  editing = false;
  editError = '';
  editCurrentStep = 1;
  targetTypes = Object.values(TargetType);
  allFeatures = Object.values(SubscriptionFeature);
  editSub: CreateSubscriptionDto = this.getEmptySubscription();

  // Delete dialog
  showDeleteDialog = false;
  deleting = false;
  deleteError = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private subscriptionService: SubscriptionService,
    private translate: TranslateService,
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

  // =========================================
  // PLAN CREATION
  // =========================================
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

  // =========================================
  // EDIT SUBSCRIPTION
  // =========================================
  openEditDialog(): void {
    if (!this.subscription) return;
    this.editSub = {
      name: this.subscription.name,
      description: this.subscription.description,
      monthlyPrice: this.subscription.price,
      targetType: this.subscription.targetType,
      color: this.subscription.color || undefined,
      features: this.subscription.features ? [...this.subscription.features] : [],
      maxMenusPerDay: this.subscription.maxMenusPerDay,
      maxImagesPerDish: this.subscription.maxImagesPerDish,
      maxProfilePhotos: this.subscription.maxProfilePhotos,
      maxRestaurants: this.subscription.maxRestaurants,
      accessMenusAndProfils: this.subscription.accessMenusAndProfils,
      rechercheAndGeo: this.subscription.rechercheAndGeo,
      miniGames: this.subscription.miniGames,
      hasAdvertisement: this.subscription.hasAdvertisement,
      backOfficeComplet: this.subscription.backOfficeComplet,
      idCardPremium: this.subscription.idCardPremium,
      parrainageViaCode: this.subscription.parrainageViaCode,
      participationTirages: this.subscription.participationTirages,
      isAllowedToBeItinerant: this.subscription.isAllowedToBeItinerant,
      canHaveGift: this.subscription.canHaveGift,
      isMultiRestaurant: this.subscription.isMultiRestaurant,
      isDefault: this.subscription.isDefault,
    };
    this.editCurrentStep = 1;
    this.editError = '';
    this.showEditDialog = true;
  }

  closeEditDialog(): void {
    this.showEditDialog = false;
    this.editCurrentStep = 1;
    this.editError = '';
  }

  updateSubscription(): void {
    this.editing = true;
    this.editError = '';

    const payload: Partial<CreateSubscriptionDto> = {
      ...this.editSub,
      monthlyPrice: Number(this.editSub.monthlyPrice),
      maxMenusPerDay: Number(this.editSub.maxMenusPerDay),
      maxImagesPerDish: Number(this.editSub.maxImagesPerDish),
      maxProfilePhotos: Number(this.editSub.maxProfilePhotos),
      maxRestaurants: Number(this.editSub.maxRestaurants),
    };

    this.subscriptionService.update(this.subscriptionId, payload)
      .pipe(finalize(() => {
        this.editing = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          this.subscription = response.subscription;
          this.closeEditDialog();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to update subscription:', err);
          this.editError = err.error?.message || 'Une erreur est survenue lors de la modification.';
          this.cdr.detectChanges();
        },
      });
  }

  isEditFeatureSelected(feature: SubscriptionFeature): boolean {
    return this.editSub.features?.includes(feature) ?? false;
  }

  toggleEditFeature(feature: SubscriptionFeature): void {
    if (!this.editSub.features) {
      this.editSub.features = [];
    }
    const index = this.editSub.features.indexOf(feature);
    if (index === -1) {
      this.editSub.features.push(feature);
    } else {
      this.editSub.features.splice(index, 1);
    }
  }

  // =========================================
  // DELETE SUBSCRIPTION
  // =========================================
  openDeleteDialog(): void {
    this.showDeleteDialog = true;
    this.deleteError = '';
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog = false;
    this.deleteError = '';
  }

  confirmDelete(): void {
    this.deleting = true;
    this.deleteError = '';

    this.subscriptionService.delete(this.subscriptionId)
      .pipe(finalize(() => {
        this.deleting = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.router.navigate(['/app/subscriptions']);
        },
        error: (err) => {
          console.error('Failed to delete subscription:', err);
          this.deleteError = err.error?.message || 'Une erreur est survenue lors de la suppression.';
          this.cdr.detectChanges();
        },
      });
  }

  // =========================================
  // HELPERS
  // =========================================
  goBack(): void {
    this.router.navigate(['/app/subscriptions']);
  }

  isRestaurant(): boolean {
    return this.subscription?.targetType === TargetType.RESTAURANT;
  }

  isEditRestaurant(): boolean {
    return this.editSub.targetType === TargetType.RESTAURANT;
  }

  private getEmptyPlan(): CreatePlanDto {
    return {
      discount: 0,
      trialPeriodDays: 14,
      billingPeriod: '' as BillingPeriod,
      currency: '' as Currency,
    };
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
