import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

interface Restaurant {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  phone: string | null;
  type: 'FIXED' | 'ITINERANT';
  imagePath: string | null;
  viewCount: number;
  clickCount: number;
  reservationEnabled: boolean;
  bookingMethod: string | null;
  bookingContact: string | null;
  openingTime: string | null;
  closingTime: string | null;
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

  constructor(
    private http: HttpClient,
    private authService: AuthService,
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

  // ── Helpers ─────────────────────────────────────────────────────────────────

  getImageUrl(path: string | null): string {
    return path || '';
  }

  getTypeLabel(type: string): string {
    return type === 'ITINERANT' ? 'MY_RESTAURANTS.TYPE_ITINERANT' : 'MY_RESTAURANTS.TYPE_FIXED';
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
