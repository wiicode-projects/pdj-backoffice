import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs';
import { MenuService, Menu, CreateMenuPayload } from '../../core/services/menu.service';
import { DishService, Dish } from '../../core/services/dish.service';
import { AuthService } from '../../core/services/auth.service';
import { MenuPreviewModal } from './menu-preview-modal/menu-preview-modal';
import { buildDraftMenu, calculateMenuPriceFromDishes } from './build-draft-menu.util';
import { canPublishMenu, countMenusForDate, MenuSubscriptionLimits } from './menu-subscription.util';
import { environment } from '../../../environments/environment';

interface ActiveSubscription {
  isDefault?: boolean;
  maxMenusPerDay?: number | null;
}

@Component({
  selector: 'pdj-menus',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, MenuPreviewModal],
  templateUrl: './menus.html',
  styleUrl: './menus.scss',
})
export class Menus implements OnInit {
  menus: Menu[] = [];
  loading = false;

  // Dishes for form selects
  allDishes: Dish[] = [];
  dishesLoading = false;

  // Form state
  formOpen = false;
  editingMenu: Menu | null = null;
  formSubmitting = false;
  formError = '';

  // Form fields
  menuName = '';
  menuPrice = 0;
  menuAvailableAt = '';
  menuIsModele = false;
  menuIsFullMenuMandatory = false;
  menuMainCourseId = '';
  menuAppetizerId = '';
  menuDessertId = '';

  // Delete confirmation
  confirmDeleteId: string | null = null;
  deleting = false;

  // Detail panel
  selectedMenu: Menu | null = null;
  panelOpen = false;

  // Customer preview
  previewOpen = false;
  previewMenu: Menu | null = null;

  // Subscription gating
  subscriptionLimits: MenuSubscriptionLimits | null = null;
  premiumModalOpen = false;
  premiumModalReason: 'default' | 'limit' = 'default';

  constructor(
    private menuService: MenuService,
    private dishService: DishService,
    private authService: AuthService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.loadMenus();
    this.loadActiveSubscription();
    this.route.queryParams.subscribe(params => {
      if (params['create'] === '1') {
        this.openCreateForm();
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { create: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
    });
  }

  get restaurantId(): string | null {
    return this.authService.user()?.restaurant?.id || null;
  }

  loadMenus(): void {
    const restaurantId = this.restaurantId;
    if (!restaurantId) return;

    this.loading = true;
    this.menuService.findByRestaurant(restaurantId)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res) => {
          this.menus = (res.menus || []).filter(m => !m.isDeleted);
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load menus:', err);
        },
      });
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

  // ── Computed helpers ────────────────────────────────────────────────────────

  get todayMenus(): Menu[] {
    const today = new Date().toISOString().split('T')[0];
    return this.menus.filter(m => {
      const menuDate = new Date(m.availableAt).toISOString().split('T')[0];
      return menuDate === today;
    });
  }

  get upcomingMenus(): Menu[] {
    const today = new Date().toISOString().split('T')[0];
    return this.menus.filter(m => {
      const menuDate = new Date(m.availableAt).toISOString().split('T')[0];
      return menuDate > today;
    });
  }

  get pastMenus(): Menu[] {
    const today = new Date().toISOString().split('T')[0];
    return this.menus.filter(m => {
      const menuDate = new Date(m.availableAt).toISOString().split('T')[0];
      return menuDate < today;
    });
  }

  get modelMenus(): Menu[] {
    return this.menus.filter(m => m.isModele);
  }

  get isDefaultPlan(): boolean {
    return this.subscriptionLimits?.isDefault === true;
  }

  get maxMenusPerDay(): number {
    return this.subscriptionLimits?.maxMenusPerDay ?? 1;
  }

  get menusForSelectedDate(): number {
    const date = this.menuAvailableAt || new Date().toISOString().split('T')[0];
    return countMenusForDate(this.menus, date);
  }

  get isMenuLimitReached(): boolean {
    if (this.editingMenu) return false;
    return this.menusForSelectedDate >= this.maxMenusPerDay;
  }

  get shouldHideCreateForm(): boolean {
    return this.isMenuLimitReached && !this.isDefaultPlan && !this.editingMenu;
  }

  // ── Subscription ───────────────────────────────────────────────────────────

  private loadActiveSubscription(): void {
    const id = this.restaurantId;
    if (!id) return;

    this.http.get<{ status: number; membership: { subscription: ActiveSubscription | null } }>(
      `${environment.apiUrl}/restaurants/${id}/subscriptions/active`,
    ).subscribe({
      next: (res) => {
        const sub = res.membership?.subscription;
        if (sub) {
          this.subscriptionLimits = {
            isDefault: sub.isDefault === true,
            maxMenusPerDay: sub.maxMenusPerDay ?? 1,
          };
        } else {
          this.subscriptionLimits = { isDefault: true, maxMenusPerDay: 1 };
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.subscriptionLimits = { isDefault: true, maxMenusPerDay: 1 };
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

  private showPremiumModal(reason: 'default' | 'limit'): void {
    this.premiumModalReason = reason;
    this.premiumModalOpen = true;
    this.cdr.detectChanges();
  }

  private guardPublish(): boolean {
    const check = canPublishMenu(
      this.subscriptionLimits,
      this.menus,
      this.menuAvailableAt,
      !this.editingMenu,
      this.editingMenu?.id,
    );
    if (!check.allowed && check.reason) {
      this.showPremiumModal(check.reason);
      return false;
    }
    return true;
  }

  // ── Form ─────────────────────────────────────────────────────────────────────

  openCreateForm(): void {
    const check = canPublishMenu(
      this.subscriptionLimits,
      this.menus,
      new Date().toISOString().split('T')[0],
      true,
    );
    if (!check.allowed && check.reason) {
      this.showPremiumModal(check.reason);
      return;
    }

    this.editingMenu = null;
    this.resetForm();
    this.menuAvailableAt = new Date().toISOString().split('T')[0];
    this.formOpen = true;
    this.loadDishes();
  }

  openEditForm(menu: Menu): void {
    this.editingMenu = menu;
    this.menuName = menu.name || '';
    this.menuPrice = menu.price || 0;
    this.menuAvailableAt = menu.availableAt ? new Date(menu.availableAt).toISOString().split('T')[0] : '';
    this.menuIsModele = menu.isModele || false;
    this.menuIsFullMenuMandatory = menu.isFullMenuMandatory ?? false;
    this.menuMainCourseId = menu.mainCourse?.id || '';
    this.menuAppetizerId = menu.appetizer?.id || '';
    this.menuDessertId = menu.dessert?.id || '';
    this.formOpen = true;
    this.loadDishes();
  }

  closeForm(): void {
    this.formOpen = false;
    this.previewOpen = false;
    this.previewMenu = null;
    this.editingMenu = null;
    this.formError = '';
    this.resetForm();
  }

  private resetForm(): void {
    this.menuName = '';
    this.menuPrice = 0;
    this.menuAvailableAt = '';
    this.menuIsModele = false;
    this.menuIsFullMenuMandatory = false;
    this.menuMainCourseId = '';
    this.menuAppetizerId = '';
    this.menuDessertId = '';
    this.formError = '';
  }

  submitForm(): void {
    if (!this.menuName.trim() || !this.menuMainCourseId) {
      this.formError = 'MENUS.FORM_REQUIRED';
      return;
    }
    if (!this.guardPublish()) return;

    const payload = this.buildPayload();
    this.formSubmitting = true;
    this.formError = '';

    const obs$ = this.editingMenu
      ? this.menuService.update(this.editingMenu.id, payload)
      : this.menuService.create(payload);

    obs$.pipe(finalize(() => {
      this.formSubmitting = false;
      this.cdr.detectChanges();
    }))
    .subscribe({
      next: () => {
        this.closeForm();
        this.loadMenus();
      },
      error: (err) => {
        console.error('Menu save failed:', err);
        this.formError = err.error?.message || 'MENUS.SAVE_ERROR';
        this.cdr.detectChanges();
      },
    });
  }

  openPreview(): void {
    if (!this.menuName.trim() || !this.menuMainCourseId) {
      this.formError = 'MENUS.FORM_REQUIRED';
      return;
    }
    if (!this.guardPublish()) return;

    this.formError = '';
    this.previewMenu = this.buildPreviewMenu();
    this.previewOpen = true;
    this.cdr.detectChanges();
  }

  closePreview(): void {
    this.previewOpen = false;
    this.previewMenu = null;
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
    this.menuService.remove(id)
      .pipe(finalize(() => {
        this.deleting = false;
        this.confirmDeleteId = null;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.menus = this.menus.filter(m => m.id !== id);
          if (this.selectedMenu?.id === id) this.closePanel();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to delete menu:', err);
        },
      });
  }

  // ── Detail panel ────────────────────────────────────────────────────────────

  openPanel(menu: Menu): void {
    this.selectedMenu = menu;
    this.panelOpen = true;
    this.confirmDeleteId = null;
    this.cdr.detectChanges();
  }

  navigateToDetail(menu: Menu): void {
    this.router.navigate(['/app/menus', menu.id]);
  }

  closePanel(): void {
    this.panelOpen = false;
    this.selectedMenu = null;
    this.confirmDeleteId = null;
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

  getDishName(dish: Dish | null): string {
    return dish?.name || '—';
  }

  getImageUrl(path: string | null): string {
    return path || '';
  }
}
