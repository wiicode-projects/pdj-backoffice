import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { environment } from '../../../environments/environment';

interface Restaurant {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  phone: string | null;
  type: 'FIXED' | 'FIXE' | 'ITINERANT' | 'MULTI';
  imagePath: string | null;
  viewCount: number;
  clickCount: number;
  reservationEnabled: boolean;
  bookingMethod: string | null;
  bookingContact: string | null;
  openingTime: string | null;
  closingTime: string | null;
  shortDescription: string | null;
  isDeleted: boolean;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  branches: Restaurant[];
  membership: {
    id: string;
    isActive: boolean;
    endingAt: string | null;
    subscription: { id: string; name: string } | null;
  } | null;
}

@Component({
  selector: 'pdj-my-restaurants',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './my-restaurants.html',
  styleUrl: './my-restaurants.scss',
})
export class MyRestaurants implements OnInit {
  restaurant: Restaurant | null = null;
  loading = false;

  // Detail panel
  selectedBranch: Restaurant | null = null;
  panelOpen = false;

  // Create branch modal
  showCreateModal = false;
  creating = false;
  createError = '';
  branchName = '';
  branchCity = '';
  branchAddress = '';
  branchType: 'FIXE' | 'ITINERANT' = 'FIXE';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private restaurantService: RestaurantService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadRestaurant();
  }

  get restaurantId(): string | null {
    return this.authService.user()?.restaurant?.id || null;
  }

  loadRestaurant(): void {
    const id = this.restaurantId;
    if (!id) return;

    this.loading = true;
    this.http.get<{ status: number; restaurant: Restaurant }>(
      `${environment.apiUrl}/restaurants/${id}`
    )
    .pipe(finalize(() => {
      this.loading = false;
      this.cdr.detectChanges();
    }))
    .subscribe({
      next: (res) => {
        this.restaurant = res.restaurant;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load restaurant:', err);
      },
    });
  }

  get branches(): Restaurant[] {
    return this.restaurant?.branches || [];
  }

  // ── Panel ───────────────────────────────────────────────────────────────────

  openPanel(branch: Restaurant): void {
    this.selectedBranch = branch;
    this.panelOpen = true;
    this.cdr.detectChanges();
  }

  closePanel(): void {
    this.panelOpen = false;
    this.selectedBranch = null;
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  navigateToManage(): void {
    this.router.navigate(['/app/manage-restaurant']);
  }

  // ── Create branch ──────────────────────────────────────────────────────────

  openCreateModal(): void {
    this.showCreateModal = true;
    this.createError = '';
    this.branchName = '';
    this.branchCity = '';
    this.branchAddress = '';
    this.branchType = 'FIXE';
    this.cdr.detectChanges();
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.createError = '';
  }

  createBranch(): void {
    if (!this.branchName.trim()) {
      this.createError = 'Le nom est requis.';
      return;
    }
    if (!this.branchCity.trim()) {
      this.createError = 'La ville est requise.';
      return;
    }

    this.creating = true;
    this.createError = '';

    const body: any = {
      name: this.branchName.trim(),
      city: this.branchCity.trim(),
      type: this.branchType,
      reservationEnabled: false,
    };
    if (this.branchAddress.trim()) {
      body.address = this.branchAddress.trim();
    }

    this.http.post<{ status: number; restaurant: any }>(
      `${environment.apiUrl}/restaurants`, body
    )
      .pipe(finalize(() => {
        this.creating = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.closeCreateModal();
          this.loadRestaurant(); // reload to get updated branches
        },
        error: (err) => {
          console.error('Failed to create branch:', err);
          this.createError = err.error?.message || 'Erreur lors de la création.';
          this.cdr.detectChanges();
        },
      });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  getImageUrl(path: string | null): string {
    return path || '';
  }

  getTypeLabel(type: string): string {
    return type === 'ITINERANT' ? 'MY_RESTAURANTS.TYPE_ITINERANT' : 'MY_RESTAURANTS.TYPE_FIXED';
  }

  getTypeLabelDirect(type: string): string {
    if (type === 'ITINERANT') return 'Itinérant';
    if (type === 'MULTI') return 'Multi-sites';
    return 'Fixe';
  }

  getTypeIcon(type: string): string {
    if (type === 'ITINERANT') return 'itinerant';
    if (type === 'MULTI') return 'multi';
    return 'fixed';
  }

  getFullAddress(r: Restaurant): string {
    const parts = [r.address, r.postalCode, r.city, r.country].filter(Boolean);
    return parts.join(', ') || '—';
  }

  getSubscriptionName(): string {
    return this.restaurant?.membership?.subscription?.name ?? '—';
  }

  isSubscriptionActive(): boolean {
    return this.restaurant?.membership?.isActive ?? false;
  }

  formatDate(date: string | null): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-CH', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }
}
