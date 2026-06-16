import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin, finalize } from 'rxjs';
import {
  DashboardService,
  DashboardStats,
  RecentUser,
  RecentRestaurant,
  RestaurantStatistics,
} from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { Menu, MenuService } from '../../core/services/menu.service';

interface KpiCard {
  icon: string;
  labelKey: string;
  value: number;
  color: string;
}

interface ChartBar {
  value: number;
  color: string;
}

interface ShortcutItem {
  titleKey: string;
  subtitleKey: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'pdj-dashboard',
  standalone: true,
  imports: [CommonModule, TranslateModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  loading = true;
  animatedValues: number[] = [0, 0, 0, 0];

  kpiCards: KpiCard[] = [
    { icon: 'users', labelKey: 'DASHBOARD.TOTAL_USERS', value: 0, color: '#3B82F6' },
    { icon: 'restaurants', labelKey: 'DASHBOARD.TOTAL_RESTAURANTS', value: 0, color: '#F59E0B' },
    { icon: 'premium-users', labelKey: 'DASHBOARD.PREMIUM_USERS', value: 0, color: '#8B5CF6' },
    { icon: 'premium-restaurants', labelKey: 'DASHBOARD.PREMIUM_RESTAURANTS', value: 0, color: '#10B981' },
  ];

  recentUsers: RecentUser[] = [];
  recentRestaurants: RecentRestaurant[] = [];

  // Restaurant dashboard
  restaurantName = '';
  views = 0;
  clicks = 0;
  onlineMenus: Menu[] = [];

  readonly viewsChartBars: ChartBar[] = [
    { value: 20, color: '#E9ECF3' },
    { value: 40, color: '#003049' },
    { value: 15, color: '#E9ECF3' },
    { value: 50, color: '#003049' },
    { value: 40, color: '#003049' },
    { value: 40, color: '#E9ECF3' },
    { value: 15, color: '#E9ECF3' },
  ];

  readonly clicksChartBars: ChartBar[] = [
    { value: 15, color: '#E9ECF3' },
    { value: 20, color: '#E9ECF3' },
    { value: 40, color: '#D52B1E' },
    { value: 50, color: '#D52B1E' },
    { value: 15, color: '#E9ECF3' },
    { value: 50, color: '#D52B1E' },
    { value: 20, color: '#E9ECF3' },
  ];

  readonly shortcuts: ShortcutItem[] = [
    {
      titleKey: 'DASHBOARD.RESTAURANT.SHORTCUT_PLANNING',
      subtitleKey: 'DASHBOARD.RESTAURANT.SHORTCUT_PLANNING_SUB',
      icon: 'planning',
      route: '/app/planning',
    },
    {
      titleKey: 'DASHBOARD.RESTAURANT.SHORTCUT_DISH',
      subtitleKey: 'DASHBOARD.RESTAURANT.SHORTCUT_DISH_SUB',
      icon: 'dish',
      route: '/app/dishes/create',
    },
    {
      titleKey: 'DASHBOARD.RESTAURANT.SHORTCUT_ESTABLISHMENT',
      subtitleKey: 'DASHBOARD.RESTAURANT.SHORTCUT_ESTABLISHMENT_SUB',
      icon: 'establishment',
      route: '/app/manage-restaurant',
    },
    {
      titleKey: 'DASHBOARD.RESTAURANT.SHORTCUT_LOCATION',
      subtitleKey: 'DASHBOARD.RESTAURANT.SHORTCUT_LOCATION_SUB',
      icon: 'location',
      route: '/app/locations',
    },
  ];

  constructor(
    private dashboardService: DashboardService,
    private menuService: MenuService,
    private authService: AuthService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {}

  get isRestaurant(): boolean {
    return this.authService.isRestaurant();
  }

  ngOnInit(): void {
    if (this.isRestaurant) {
      this.loadRestaurantDashboard();
    } else {
      this.loadAdminDashboard();
    }
  }

  loadAdminDashboard(): void {
    this.loading = true;
    this.dashboardService.getDashboard()
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (data) => {
          this.kpiCards[0].value = data.totalUsers;
          this.kpiCards[1].value = data.totalRestaurants;
          this.kpiCards[2].value = data.premiumUsers;
          this.kpiCards[3].value = data.premiumRestaurants;
          this.recentUsers = data.recentUsers;
          this.recentRestaurants = data.recentRestaurants;
          this.cdr.detectChanges();
          this.animateCountUp();
        },
        error: (err) => {
          console.error('Failed to load dashboard:', err);
        },
      });
  }

  loadRestaurantDashboard(): void {
    const restaurantId = this.authService.restaurantId();
    this.restaurantName = this.authService.user()?.restaurant?.name ?? '';

    if (!restaurantId) {
      this.loading = false;
      return;
    }

    this.loading = true;
    forkJoin({
      stats: this.dashboardService.getRestaurantStatistics(),
      menus: this.menuService.findByRestaurant(restaurantId),
    })
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: ({ stats, menus }) => {
          this.applyRestaurantStats(stats);
          this.onlineMenus = (menus.menus || [])
            .filter(m => !m.isDeleted)
            .sort((a, b) => new Date(b.availableAt).getTime() - new Date(a.availableAt).getTime());
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load restaurant dashboard:', err);
        },
      });
  }

  getUserName(user: RecentUser): string {
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'ADMIN': return 'badge--admin';
      case 'RESTAURANT': return 'badge--restaurant';
      default: return 'badge--user';
    }
  }

  formatNumber(value: number): string {
    return value.toLocaleString('fr-CH');
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(price);
  }

  formatMenuDate(date: string): string {
    const d = new Date(date);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    if (d.toDateString() === today.toDateString()) {
      return this.translate.instant('DASHBOARD.RESTAURANT.TODAY');
    }
    if (d.toDateString() === tomorrow.toDateString()) {
      return this.translate.instant('DASHBOARD.RESTAURANT.TOMORROW');
    }
    return d.toLocaleDateString('fr-CH', { day: 'numeric', month: 'short' });
  }

  getImageUrl(path: string | null): string {
    return path || '';
  }

  getBarHeight(value: number): string {
    return `${Math.min(100, (value / 50) * 100)}%`;
  }

  private applyRestaurantStats(stats: RestaurantStatistics): void {
    this.views = stats.views ?? 0;
    this.clicks = stats.clicks ?? 0;
  }

  private animateCountUp(): void {
    const duration = 1200;
    const startTime = performance.now();

    const easeOutExpo = (t: number): number => {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    };

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(progress);

      this.animatedValues = this.kpiCards.map(card =>
        Math.round(eased * card.value)
      );
      this.cdr.detectChanges();

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }
}
