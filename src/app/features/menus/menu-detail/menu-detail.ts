import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs';
import { MenuService, Menu, CreateMenuPayload } from '../../../core/services/menu.service';
import { DishService, Dish, DishGalleryImage } from '../../../core/services/dish.service';
import { AuthService } from '../../../core/services/auth.service';
import { MenuPreviewModal } from '../menu-preview-modal/menu-preview-modal';
import { buildDraftMenu, calculateMenuPriceFromDishes } from '../build-draft-menu.util';
import { canPublishMenu, MenuSubscriptionLimits } from '../menu-subscription.util';
import { environment } from '../../../../environments/environment';

interface ActiveSubscription {
  isDefault?: boolean;
  maxMenusPerDay?: number | null;
}

@Component({
  selector: 'pdj-menu-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, MenuPreviewModal],
  templateUrl: './menu-detail.html',
  styleUrl: './menu-detail.scss',
})
export class MenuDetail implements OnInit {
  menu: Menu | null = null;
  loading = true;
  error = '';

  // Lightbox
  lightboxOpen = false;
  lightboxImages: string[] = [];
  lightboxIndex = 0;

  // Edit form
  formOpen = false;
  formSubmitting = false;
  formError = '';
  allDishes: Dish[] = [];
  dishesLoading = false;

  // Form fields
  menuName = '';
  menuPrice = 0;
  menuAvailableAt = '';
  menuIsModele = false;
  menuIsFullMenuMandatory = false;
  menuMainCourseId = '';
  menuAppetizerId = '';
  menuDessertId = '';

  // Customer preview
  previewOpen = false;
  previewMenu: Menu | null = null;
  previewReadOnly = false;

  allMenus: Menu[] = [];
  subscriptionLimits: MenuSubscriptionLimits | null = null;
  premiumModalOpen = false;
  premiumModalReason: 'default' | 'limit' = 'default';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private menuService: MenuService,
    private dishService: DishService,
    private authService: AuthService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadSubscriptionData();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadMenu(id);
    } else {
      this.error = 'No menu ID provided';
      this.loading = false;
    }
  }

  get restaurantId(): string | null {
    return this.authService.user()?.restaurant?.id || null;
  }

  loadMenu(id: string): void {
    this.loading = true;
    this.menuService.findOne(id)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res) => {
          this.menu = res.menu;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load menu:', err);
          this.error = err.error?.message || 'Failed to load menu';
          this.cdr.detectChanges();
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/app/menus']);
  }

  get maxMenusPerDay(): number {
    return this.subscriptionLimits?.maxMenusPerDay ?? 1;
  }

  private loadSubscriptionData(): void {
    const id = this.restaurantId;
    if (!id) return;

    this.http.get<{ status: number; membership: { subscription: ActiveSubscription | null } }>(
      `${environment.apiUrl}/restaurants/${id}/subscriptions/active`,
    ).subscribe({
      next: (res) => {
        const sub = res.membership?.subscription;
        this.subscriptionLimits = sub
          ? { isDefault: sub.isDefault === true, maxMenusPerDay: sub.maxMenusPerDay ?? 1 }
          : { isDefault: true, maxMenusPerDay: 1 };
        this.cdr.detectChanges();
      },
      error: () => {
        this.subscriptionLimits = { isDefault: true, maxMenusPerDay: 1 };
        this.cdr.detectChanges();
      },
    });

    this.menuService.findByRestaurant(id).subscribe({
      next: (res) => {
        this.allMenus = (res.menus || []).filter(m => !m.isDeleted);
        this.cdr.detectChanges();
      },
    });
  }

  goToMembership(): void {
    this.closePremiumModal();
    this.router.navigate(['/app/membership']);
  }

  closePremiumModal(): void {
    this.premiumModalOpen = false;
    this.cdr.detectChanges();
  }

  private guardPublish(): boolean {
    const check = canPublishMenu(
      this.subscriptionLimits,
      this.allMenus,
      this.menuAvailableAt,
      false,
      this.menu?.id,
    );
    if (!check.allowed && check.reason) {
      this.premiumModalReason = check.reason;
      this.premiumModalOpen = true;
      this.cdr.detectChanges();
      return false;
    }
    return true;
  }

  // ── Edit form ──────────────────────────────────────────────────────────────

  openEditForm(): void {
    if (!this.menu) return;
    this.menuName = this.menu.name || '';
    this.menuPrice = this.menu.price || 0;
    this.menuAvailableAt = this.menu.availableAt
      ? new Date(this.menu.availableAt).toISOString().split('T')[0]
      : '';
    this.menuIsModele = this.menu.isModele || false;
    this.menuIsFullMenuMandatory = this.menu.isFullMenuMandatory ?? false;
    this.menuMainCourseId = this.menu.mainCourse?.id || '';
    this.menuAppetizerId = this.menu.appetizer?.id || '';
    this.menuDessertId = this.menu.dessert?.id || '';
    this.formError = '';
    this.formOpen = true;
    this.loadDishes();
  }

  closeForm(): void {
    this.formOpen = false;
    this.previewOpen = false;
    this.previewMenu = null;
    this.previewReadOnly = false;
    this.formError = '';
  }

  loadDishes(): void {
    const restaurantId = this.restaurantId;
    if (!restaurantId) return;

    this.dishesLoading = true;
    this.dishService.findAll(1, 200, restaurantId)
      .pipe(finalize(() => {
        this.dishesLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res) => {
          this.allDishes = (res.items || []).filter(d => !d.isDeleted);
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load dishes:', err);
        },
      });
  }

  submitForm(): void {
    if (!this.menu) return;
    if (!this.menuName.trim() || !this.menuMainCourseId) {
      this.formError = 'Le nom et le plat principal sont requis.';
      return;
    }
    if (!this.guardPublish()) return;

    this.formSubmitting = true;
    this.formError = '';

    this.menuService.update(this.menu.id, this.buildPayload())
      .pipe(finalize(() => {
        this.formSubmitting = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.closeForm();
          this.loadMenu(this.menu!.id);
        },
        error: (err) => {
          console.error('Menu update failed:', err);
          this.formError = err.error?.message || 'Erreur lors de la mise à jour.';
          this.cdr.detectChanges();
        },
      });
  }

  openPreview(): void {
    if (!this.menuName.trim() || !this.menuMainCourseId) {
      this.formError = 'Le nom et le plat principal sont requis.';
      return;
    }
    if (!this.guardPublish()) return;

    this.formError = '';
    this.previewMenu = this.buildPreviewMenu();
    this.previewReadOnly = false;
    this.previewOpen = true;
    this.cdr.detectChanges();
  }

  closePreview(): void {
    this.previewOpen = false;
    this.previewMenu = null;
    this.previewReadOnly = false;
  }

  openSavedMenuPreview(): void {
    if (!this.menu) return;
    const restaurant = this.authService.user()?.restaurant;
    this.previewMenu = {
      ...this.menu,
      restaurant: this.menu.restaurant ?? (restaurant ? { id: restaurant.id, name: restaurant.name } : null),
    };
    this.previewReadOnly = true;
    this.previewOpen = true;
    this.cdr.detectChanges();
  }

  confirmPreview(): void {
    this.submitForm();
  }

  private buildPayload(): CreateMenuPayload {
    const payload: CreateMenuPayload = {
      name: this.menuName.trim(),
      price: Number(this.menuPrice) || 0,
      mainCourseId: this.menuMainCourseId,
      isModele: this.menuIsModele,
      isFullMenuMandatory: this.menuIsFullMenuMandatory,
      availableAt: this.menuAvailableAt || new Date().toISOString().split('T')[0],
    };

    if (this.menuAppetizerId) {
      payload.appetizerId = this.menuAppetizerId;
    }
    if (this.menuDessertId) {
      payload.dessertId = this.menuDessertId;
    }

    return payload;
  }

  private buildPreviewMenu(): Menu {
    const restaurant = this.authService.user()?.restaurant;
    return buildDraftMenu({
      name: this.menuName,
      price: this.menuPrice,
      availableAt: this.menuAvailableAt || new Date().toISOString().split('T')[0],
      mainCourse: this.getDishById(this.menuMainCourseId),
      appetizer: this.menuAppetizerId ? this.getDishById(this.menuAppetizerId) : null,
      dessert: this.menuDessertId ? this.getDishById(this.menuDessertId) : null,
      restaurant: restaurant ? { id: restaurant.id, name: restaurant.name } : null,
      isModele: this.menuIsModele,
      isFullMenuMandatory: this.menuIsFullMenuMandatory,
    });
  }

  onDishSelectionChange(): void {
    this.menuPrice = calculateMenuPriceFromDishes(
      this.menuAppetizerId ? this.getDishById(this.menuAppetizerId) : null,
      this.menuMainCourseId ? this.getDishById(this.menuMainCourseId) : null,
      this.menuDessertId ? this.getDishById(this.menuDessertId) : null,
    );
  }

  private getDishById(id: string): Dish | null {
    return this.allDishes.find(d => d.id === id) ?? null;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(price);
  }

  formatDate(date: string): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-CH', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  formatShortDate(date: string): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-CH', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  getCategoryLabel(category: string | null): string {
    if (!category) return '';
    const map: Record<string, string> = {
      ENTREE: 'Entrée',
      PLAT_PRINCIPAL: 'Plat principal',
      DESSERT: 'Dessert',
      BOISSON: 'Boisson',
      ACCOMPAGNEMENT: 'Accompagnement',
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

  getMenuRoleColor(role: string): string {
    const map: Record<string, string> = {
      'Entrée': '#10B981',
      'Plat principal': '#DC2626',
      'Dessert': '#F59E0B',
    };
    return map[role] || '#6B7280';
  }

  getDietLabel(diet: string | null): string {
    if (!diet) return '';
    const map: Record<string, string> = {
      VEGAN: 'Vegan',
      VEGETARIAN: 'Végétarien',
      GLUTEN_FREE: 'Sans gluten',
      HALAL: 'Halal',
    };
    return map[diet] || diet;
  }

  getAllImages(dish: Dish): string[] {
    const images: string[] = [];
    if (dish.image) images.push(dish.image);
    if (dish.gallery) {
      dish.gallery.forEach((g: DishGalleryImage) => {
        if (g.path && g.path !== dish.image) images.push(g.path);
      });
    }
    return images;
  }

  getDishes(): { dish: Dish; role: string }[] {
    if (!this.menu) return [];
    const list: { dish: Dish; role: string }[] = [];
    if (this.menu.appetizer) list.push({ dish: this.menu.appetizer, role: 'Entrée' });
    if (this.menu.mainCourse) list.push({ dish: this.menu.mainCourse, role: 'Plat principal' });
    if (this.menu.dessert) list.push({ dish: this.menu.dessert, role: 'Dessert' });
    return list;
  }

  // ── Lightbox ────────────────────────────────────────────────────────────────

  openLightbox(images: string[], startIndex: number): void {
    this.lightboxImages = images;
    this.lightboxIndex = startIndex;
    this.lightboxOpen = true;
  }

  closeLightbox(): void {
    this.lightboxOpen = false;
  }

  prevImage(): void {
    this.lightboxIndex = (this.lightboxIndex - 1 + this.lightboxImages.length) % this.lightboxImages.length;
  }

  nextImage(): void {
    this.lightboxIndex = (this.lightboxIndex + 1) % this.lightboxImages.length;
  }
}
