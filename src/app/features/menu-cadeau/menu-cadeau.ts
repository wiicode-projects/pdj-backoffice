import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import {
  GiftType,
  RestaurantGift,
  RestaurantGiftService,
} from '../../core/services/restaurant-gift.service';
import { environment } from '../../../environments/environment';

interface GiftOption {
  id: GiftType;
  labelKey: string;
  color: string;
  bg: string;
}

interface ActiveSubscription {
  canHaveGift?: boolean;
}

@Component({
  selector: 'pdj-menu-cadeau',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './menu-cadeau.html',
  styleUrl: './menu-cadeau.scss',
})
export class MenuCadeau implements OnInit {
  loading = true;
  saving = false;
  error = '';
  successMessage = '';

  existingGift: RestaurantGift | null = null;
  canHaveGift = false;

  isActive = true;
  selectedGift: GiftType = 'CAFE';
  customGiftLabel = '';
  offerText = '';

  readonly maxChars = 120;
  readonly maxLabelChars = 50;

  readonly giftOptions: GiftOption[] = [
    { id: 'CAFE', labelKey: 'MENU_CADEAU.TYPE_CAFE', color: '#DC2626', bg: '#fff0f0' },
    { id: 'DESSERT', labelKey: 'MENU_CADEAU.TYPE_DESSERT', color: '#D97706', bg: '#fffbeb' },
    { id: 'DIGESTIF', labelKey: 'MENU_CADEAU.TYPE_DIGESTIF', color: '#3B82F6', bg: '#eff6ff' },
    { id: 'AUTRE', labelKey: 'MENU_CADEAU.TYPE_AUTRE', color: '#16A34A', bg: '#f0fdf4' },
  ];

  constructor(
    private authService: AuthService,
    private giftService: RestaurantGiftService,
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  get restaurantId(): string | null {
    return this.authService.user()?.restaurant?.id || null;
  }

  get isAutreSelected(): boolean {
    return this.selectedGift === 'AUTRE';
  }

  ngOnInit(): void {
    this.loadPage();
  }

  loadPage(): void {
    const id = this.restaurantId;
    if (!id) {
      this.loading = false;
      return;
    }

    this.loading = true;
    forkJoin({
      gift: this.giftService.getGift(id),
      subscription: this.http.get<{ status: number; membership: { subscription: ActiveSubscription | null } }>(
        `${environment.apiUrl}/restaurants/${id}/subscriptions/active`,
      ),
    })
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: ({ gift, subscription }) => {
          this.canHaveGift = subscription.membership?.subscription?.canHaveGift === true;
          this.existingGift = gift.gift;
          this.populateForm(gift.gift);
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load menu cadeau:', err);
          this.error = 'MENU_CADEAU.LOAD_ERROR';
          this.cdr.detectChanges();
        },
      });
  }

  private populateForm(gift: RestaurantGift | null): void {
    if (!gift) {
      this.isActive = true;
      this.selectedGift = 'CAFE';
      this.customGiftLabel = '';
      this.offerText = '';
      return;
    }

    this.isActive = gift.isActive;
    this.selectedGift = gift.giftType;
    this.customGiftLabel = gift.label ?? '';
    this.offerText = gift.description ?? '';
  }

  selectGiftType(type: GiftType): void {
    if (!this.canHaveGift) return;
    this.selectedGift = type;
    if (type !== 'AUTRE') {
      this.customGiftLabel = '';
    }
    this.cdr.detectChanges();
  }

  toggleActive(): void {
    if (!this.canHaveGift) return;
    this.isActive = !this.isActive;
    this.cdr.detectChanges();
  }

  goToMembership(): void {
    this.router.navigate(['/app/membership']);
  }

  saveGift(): void {
    if (!this.canHaveGift || !this.restaurantId) return;

    if (this.isAutreSelected && !this.customGiftLabel.trim()) {
      this.error = 'MENU_CADEAU.LABEL_REQUIRED';
      return;
    }

    this.saving = true;
    this.error = '';
    this.successMessage = '';

    const payload = {
      giftType: this.selectedGift,
      description: this.offerText.trim() || undefined,
      label: this.isAutreSelected ? this.customGiftLabel.trim() : undefined,
      isActive: this.isActive,
    };

    this.giftService.upsertGift(this.restaurantId, payload)
      .pipe(finalize(() => {
        this.saving = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res) => {
          this.existingGift = res.gift;
          this.successMessage = 'MENU_CADEAU.SAVE_SUCCESS';
          setTimeout(() => {
            this.successMessage = '';
            this.cdr.detectChanges();
          }, 3000);
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to save gift:', err);
          this.error = err.error?.message || 'MENU_CADEAU.SAVE_ERROR';
          this.cdr.detectChanges();
        },
      });
  }
}
