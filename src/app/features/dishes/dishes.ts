import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { DishService, Dish, PaginatedDishes } from '../../core/services/dish.service';
import { AuthService } from '../../core/services/auth.service';

type DishCategory = 'ALL' | 'ENTREE' | 'PLAT_PRINCIPAL' | 'DESSERT' | 'BOISSON' | 'ACCOMPAGNEMENT';

interface CategoryTab {
  value: DishCategory;
  labelKey: string;
}

@Component({
  selector: 'pdj-dishes',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './dishes.html',
  styleUrl: './dishes.scss',
})
export class Dishes implements OnInit {
  dishes: Dish[] = [];
  loading = false;
  totalItems = 0;

  // Filters
  selectedCategory: DishCategory = 'ALL';
  searchText = '';
  private searchDebounceTimer: any;

  // Detail panel
  selectedDish: Dish | null = null;
  panelOpen = false;
  activeImage: string | null = null;

  // Delete
  confirmDeleteId: string | null = null;
  deleting = false;

  readonly categories: CategoryTab[] = [
    { value: 'ALL', labelKey: 'DISHES.FILTER.ALL' },
    { value: 'ENTREE', labelKey: 'DISHES.CATEGORIES.ENTREE' },
    { value: 'PLAT_PRINCIPAL', labelKey: 'DISHES.CATEGORIES.PLAT_PRINCIPAL' },
    { value: 'DESSERT', labelKey: 'DISHES.CATEGORIES.DESSERT' },
    { value: 'BOISSON', labelKey: 'DISHES.CATEGORIES.BOISSON' },
    { value: 'ACCOMPAGNEMENT', labelKey: 'DISHES.CATEGORIES.ACCOMPAGNEMENT' },
  ];

  constructor(
    private dishService: DishService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  navigateToCreate(): void {
    this.router.navigate(['/app/dishes/create']);
  }

  navigateToEdit(id: string): void {
    this.router.navigate(['/app/dishes', id, 'edit']);
  }

  ngOnInit(): void {
    this.loadDishes();
  }

  get restaurantId(): string | null {
    return this.authService.user()?.restaurant?.id || null;
  }

  // ── Data loading ────────────────────────────────────────────────────────────

  loadDishes(): void {
    const restaurantId = this.restaurantId;
    if (!restaurantId) {
      console.warn('[Dishes] No restaurant ID found on user — fetching all dishes. Try logging out and back in.');
    }

    this.loading = true;
    const category = this.selectedCategory !== 'ALL' ? this.selectedCategory : undefined;
    const search = this.searchText.trim() || undefined;

    this.dishService.findAll(1, 100, restaurantId || undefined, search, category)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res) => {
          this.dishes = (res.items || []).filter(d => !d.isDeleted);
          this.totalItems = res.meta?.totalItems || this.dishes.length;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load dishes:', err);
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
  }

  // ── Filters ─────────────────────────────────────────────────────────────────

  selectCategory(cat: DishCategory): void {
    this.selectedCategory = cat;
    this.loadDishes();
  }

  onSearchInput(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.loadDishes();
    }, 400);
  }

  clearSearch(): void {
    this.searchText = '';
    this.loadDishes();
  }

  // ── Detail panel ────────────────────────────────────────────────────────────

  openPanel(dish: Dish): void {
    this.selectedDish = dish;
    this.panelOpen = true;
    this.activeImage = null;
    this.confirmDeleteId = null;
    this.cdr.detectChanges();
  }

  closePanel(): void {
    this.panelOpen = false;
    this.selectedDish = null;
    this.activeImage = null;
    this.confirmDeleteId = null;
  }

  getAllImages(dish: Dish): string[] {
    const images: string[] = [];
    if (dish.image) images.push(dish.image);
    if (dish.gallery) {
      dish.gallery.forEach(g => {
        if (g.path) images.push(g.path);
      });
    }
    return images;
  }

  getActiveImageIndex(dish: Dish): number {
    const all = this.getAllImages(dish);
    const current = this.activeImage || dish.image;
    const idx = all.indexOf(current || '');
    return idx >= 0 ? idx : 0;
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  askDelete(id: string, event: Event): void {
    event.stopPropagation();
    this.confirmDeleteId = id;
  }

  cancelDelete(): void {
    this.confirmDeleteId = null;
  }

  confirmDelete(id: string): void {
    this.deleting = true;
    this.dishService.remove(id)
      .pipe(finalize(() => {
        this.deleting = false;
        this.confirmDeleteId = null;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.dishes = this.dishes.filter(d => d.id !== id);
          if (this.selectedDish?.id === id) this.closePanel();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to delete dish:', err);
        },
      });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(price);
  }

  getCategoryLabel(category: string | null): string {
    if (!category) return '';
    const map: Record<string, string> = {
      ENTREE: 'DISHES.CATEGORIES.ENTREE',
      PLAT_PRINCIPAL: 'DISHES.CATEGORIES.PLAT_PRINCIPAL',
      DESSERT: 'DISHES.CATEGORIES.DESSERT',
      BOISSON: 'DISHES.CATEGORIES.BOISSON',
      ACCOMPAGNEMENT: 'DISHES.CATEGORIES.ACCOMPAGNEMENT',
    };
    return map[category] || category;
  }

  getCategoryColor(category: string | null): string {
    const map: Record<string, string> = {
      ENTREE: '#10B981',
      PLAT_PRINCIPAL: '#DC2626',
      DESSERT: '#F59E0B',
      BOISSON: '#3B82F6',
      ACCOMPAGNEMENT: '#8B5CF6',
    };
    return map[category || ''] || '#6B7280';
  }

  getImageUrl(path: string | null): string {
    return path || '';
  }

  getDietLabel(diet: string | null): string {
    if (!diet) return '';
    const map: Record<string, string> = {
      VEGAN: 'DISHES.DIETS.VEGAN',
      VEGETARIAN: 'DISHES.DIETS.VEGETARIAN',
      GLUTEN_FREE: 'DISHES.DIETS.GLUTEN_FREE',
      HALAL: 'DISHES.DIETS.HALAL',
    };
    return map[diet] || diet;
  }
}
