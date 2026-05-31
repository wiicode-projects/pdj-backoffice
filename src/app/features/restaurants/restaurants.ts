import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { RestaurantService, AdminRestaurant, PaginatedRestaurants } from '../../core/services/restaurant.service';

@Component({
  selector: 'pdj-restaurants',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './restaurants.html',
  styleUrl: './restaurants.scss',
})
export class Restaurants implements OnInit {
  allRestaurants: AdminRestaurant[] = [];
  loading = false;

  // Search & filter
  searchQuery = '';
  typeFilter: 'all' | 'FIXED' | 'ITINERANT' = 'all';

  // Side panel
  selectedRestaurant: AdminRestaurant | null = null;
  panelOpen = false;

  // Delete
  confirmDeleteId: string | null = null;
  deleting = false;

  // Ban toggle
  togglingActiveId: string | null = null;



  constructor(
    private restaurantService: RestaurantService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadRestaurants();
  }

  loadRestaurants(): void {
    this.loading = true;
    this.restaurantService.findAll(1, 100)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res: PaginatedRestaurants) => {
          // Only top-level (non-branch) restaurants
          this.allRestaurants = (res.items || []).filter(r => !r.parentId);
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Failed to load restaurants:', err),
      });
  }

  // ── Computed ─────────────────────────────────────────────────────────────────

  get filteredRestaurants(): AdminRestaurant[] {
    let list = this.allRestaurants;

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        (r.city && r.city.toLowerCase().includes(q))
      );
    }

    if (this.typeFilter !== 'all') {
      list = list.filter(r => r.type === this.typeFilter);
    }

    return list;
  }

  get totalFixed(): number    { return this.allRestaurants.filter(r => r.type === 'FIXED').length; }
  get totalItinerant(): number { return this.allRestaurants.filter(r => r.type === 'ITINERANT').length; }
  get totalPremium(): number  { return this.allRestaurants.filter(r => r.membership?.isActive).length; }
  get totalBranches(): number {
    return this.allRestaurants.reduce((acc, r) => acc + (r.branches?.length ?? 0), 0);
  }

  getBranchCount(r: AdminRestaurant): number {
    return r.branches?.length ?? 0;
  }

  getOwnerName(r: AdminRestaurant): string {
    if (!r.users || r.users.length === 0) return '—';
    const u = r.users[0];
    return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email;
  }

  getImageUrl(r: AdminRestaurant): string | null {
    return r.imagePath || null;
  }

  getMembershipStatus(r: AdminRestaurant): 'none' | 'active' | 'inactive' {
    if (!r.membership) return 'none';
    return r.membership.isActive ? 'active' : 'inactive';
  }

  // ── Side panel ───────────────────────────────────────────────────────────────

  openPanel(r: AdminRestaurant): void {
    this.router.navigate(['/app/restaurants', r.id]);
  }

  closePanel(): void {
    this.panelOpen = false;
    this.selectedRestaurant = null;
    this.confirmDeleteId = null;
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  askDelete(id: string, event: Event): void {
    event.stopPropagation();
    this.confirmDeleteId = id;
  }

  cancelDelete(): void {
    this.confirmDeleteId = null;
  }

  confirmDelete(id: string): void {
    this.deleting = true;
    this.restaurantService.remove(id)
      .pipe(finalize(() => {
        this.deleting = false;
        this.confirmDeleteId = null;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.allRestaurants = this.allRestaurants.filter(r => r.id !== id);
          if (this.selectedRestaurant?.id === id) this.closePanel();
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Failed to delete restaurant:', err),
      });
  }

  // ── Ban toggle ───────────────────────────────────────────────────────────────

  toggleRestaurantActive(restaurant: AdminRestaurant, event: Event): void {
    event.stopPropagation();
    if (this.togglingActiveId === restaurant.id) return;
    const newState = !restaurant.isActive;
    // Optimistic update
    restaurant.isActive = newState;
    this.togglingActiveId = restaurant.id;
    this.cdr.detectChanges();

    this.restaurantService.toggleActive(restaurant.id, newState)
      .pipe(finalize(() => {
        this.togglingActiveId = null;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res) => {
          restaurant.isActive = res.restaurant.isActive;
          this.cdr.detectChanges();
        },
        error: () => {
          restaurant.isActive = !newState;
          this.cdr.detectChanges();
        },
      });
  }
}
