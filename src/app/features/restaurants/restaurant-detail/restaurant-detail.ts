import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, finalize, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { RestaurantService, AdminRestaurant, Invoice } from '../../../core/services/restaurant.service';
import { DishService } from '../../../core/services/dish.service';
import { MenuService } from '../../../core/services/menu.service';

@Component({
  selector: 'pdj-restaurant-detail',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './restaurant-detail.html',
  styleUrl: './restaurant-detail.scss',
})
export class RestaurantDetail implements OnInit {
  restaurant: AdminRestaurant | null = null;
  loading = true;
  restaurantId = '';

  // Stats
  dishCount = 0;
  menuCount = 0;

  // Carousel
  allImages: string[] = [];
  selectedImageIndex = 0;

  @ViewChild('thumbStrip') thumbStrip!: ElementRef<HTMLDivElement>;

  // Delete
  showDeleteDialog = false;
  deleting = false;

  // Toggle active
  togglingActive = false;

  // Invoices
  invoices: Invoice[] = [];



  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private restaurantService: RestaurantService,
    private dishService: DishService,
    private menuService: MenuService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.restaurantId = this.route.snapshot.paramMap.get('id') || '';
    if (this.restaurantId) {
      this.loadRestaurant();
    }
  }

  loadRestaurant(): void {
    this.loading = true;

    forkJoin({
      restaurant: this.restaurantService.findOne(this.restaurantId),
      dishes: this.dishService.findAll(1, 1, this.restaurantId).pipe(
        catchError(() => of({ items: [], meta: { totalItems: 0, itemCount: 0, itemsPerPage: 1, totalPages: 0, currentPage: 1 } }))
      ),
      menus: this.menuService.findByRestaurant(this.restaurantId).pipe(
        catchError(() => of({ status: 200, menus: [] }))
      ),
      invoices: this.restaurantService.findInvoices(this.restaurantId).pipe(
        catchError(() => of({ status: 200, invoices: [] }))
      ),
    })
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (result) => {
          this.restaurant = result.restaurant.restaurant;
          this.dishCount = result.dishes.meta?.totalItems ?? result.dishes.items?.length ?? 0;
          this.menuCount = result.menus.menus?.length ?? 0;
          this.invoices = result.invoices.invoices ?? [];
          this.buildImageList();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load restaurant:', err);
        },
      });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  goBack(): void {
    this.router.navigate(['/app/restaurants']);
  }

  getImageUrl(r: AdminRestaurant): string | null {
    return r.imagePath || null;
  }

  // ── Carousel ───────────────────────────────────────────────────────────────

  private buildImageList(): void {
    this.allImages = [];
    if (this.restaurant?.imagePath) {
      this.allImages.push(this.restaurant.imagePath);
    }
    if (this.restaurant?.images?.length) {
      for (const img of this.restaurant.images) {
        if (img.path && !this.allImages.includes(img.path)) {
          this.allImages.push(img.path);
        }
      }
    }
    this.selectedImageIndex = 0;
  }

  get currentImage(): string | null {
    if (!this.allImages.length) return null;
    return this.allImages[this.selectedImageIndex];
  }

  selectImage(index: number): void {
    this.selectedImageIndex = index;
    this.cdr.detectChanges();
  }

  prevImage(): void {
    if (this.allImages.length <= 1) return;
    this.selectedImageIndex = this.selectedImageIndex === 0
      ? this.allImages.length - 1
      : this.selectedImageIndex - 1;
    this.scrollThumbIntoView();
    this.cdr.detectChanges();
  }

  nextImage(): void {
    if (this.allImages.length <= 1) return;
    this.selectedImageIndex = this.selectedImageIndex === this.allImages.length - 1
      ? 0
      : this.selectedImageIndex + 1;
    this.scrollThumbIntoView();
    this.cdr.detectChanges();
  }

  getThumbUrl(index: number): string {
    return this.allImages[index];
  }

  scrollThumbs(direction: 'left' | 'right'): void {
    if (!this.thumbStrip) return;
    const el = this.thumbStrip.nativeElement;
    const scrollAmount = 200;
    el.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
  }

  private scrollThumbIntoView(): void {
    setTimeout(() => {
      if (!this.thumbStrip) return;
      const el = this.thumbStrip.nativeElement;
      const thumb = el.children[this.selectedImageIndex] as HTMLElement;
      if (thumb) {
        thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    });
  }

  getOwnerName(): string {
    if (!this.restaurant?.users || this.restaurant.users.length === 0) return '—';
    const u = this.restaurant.users[0];
    return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email;
  }

  getOwnerEmail(): string {
    if (!this.restaurant?.users || this.restaurant.users.length === 0) return '—';
    return this.restaurant.users[0].email;
  }

  getOwnerInitials(): string {
    if (!this.restaurant?.users || this.restaurant.users.length === 0) return '?';
    const u = this.restaurant.users[0];
    return ((u.firstName?.[0] || '') + (u.lastName?.[0] || '')).toUpperCase() || '?';
  }

  getMembershipStatus(): 'none' | 'active' | 'inactive' {
    if (!this.restaurant?.membership) return 'none';
    return this.restaurant.membership.isActive ? 'active' : 'inactive';
  }

  getBranchCount(): number {
    return (this.restaurant as any)?.branches?.length ?? 0;
  }

  getBranchImageUrl(branch: AdminRestaurant): string | null {
    return branch.imagePath || null;
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  openDeleteDialog(): void {
    this.showDeleteDialog = true;
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog = false;
  }

  confirmDelete(): void {
    this.deleting = true;
    this.restaurantService.remove(this.restaurantId)
      .pipe(finalize(() => {
        this.deleting = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.router.navigate(['/app/restaurants']);
        },
        error: (err) => console.error('Failed to delete restaurant:', err),
      });
  }

  // ── Toggle active ──────────────────────────────────────────────────────────

  toggleActive(): void {
    if (!this.restaurant || this.togglingActive) return;
    const newState = !this.restaurant.isActive;
    this.togglingActive = true;
    this.restaurant.isActive = newState; // optimistic
    this.cdr.detectChanges();

    this.restaurantService.toggleActive(this.restaurant.id, newState)
      .pipe(finalize(() => {
        this.togglingActive = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res) => {
          this.restaurant!.isActive = res.restaurant.isActive;
          this.cdr.detectChanges();
        },
        error: () => {
          this.restaurant!.isActive = !newState; // rollback
          this.cdr.detectChanges();
        },
      });
  }
}
