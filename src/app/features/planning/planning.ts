import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { Menu, MenuService } from '../../core/services/menu.service';
import { AuthService } from '../../core/services/auth.service';
import {
  addWeeks,
  endOfWeek,
  formatDayMonth,
  formatWeekdayDate,
  isToday,
  isTomorrow,
  isWithinInterval,
  startOfWeek,
  toDateKey,
} from './planning-date.utils';

export interface PlanningDayGroup {
  dateKey: string;
  menus: Menu[];
}

@Component({
  selector: 'pdj-planning',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './planning.html',
  styleUrl: './planning.scss',
})
export class Planning implements OnInit {
  menus: Menu[] = [];
  loading = false;
  weekOffset = 0;

  constructor(
    private menuService: MenuService,
    private authService: AuthService,
    private translate: TranslateService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadMenus();
  }

  get restaurantId(): string | null {
    return this.authService.user()?.restaurant?.id || null;
  }

  get weekStart(): Date {
    return startOfWeek(addWeeks(new Date(), this.weekOffset));
  }

  get weekEnd(): Date {
    return endOfWeek(addWeeks(new Date(), this.weekOffset));
  }

  get weekLabel(): string {
    if (this.weekOffset === 0) {
      return this.translate.instant('PLANNING.THIS_WEEK');
    }
    if (this.weekOffset === -1) {
      return this.translate.instant('PLANNING.PREVIOUS_WEEK');
    }
    if (this.weekOffset === 1) {
      return this.translate.instant('PLANNING.NEXT_WEEK');
    }
    const locale = this.getLocale();
    return `${formatDayMonth(this.weekStart, locale)} – ${formatDayMonth(this.weekEnd, locale)}`;
  }

  get weekDateRange(): string {
    const locale = this.getLocale();
    const endYear = this.weekEnd.getFullYear();
    return `${formatDayMonth(this.weekStart, locale)} – ${formatDayMonth(this.weekEnd, locale)} ${endYear}`;
  }

  get dayGroups(): PlanningDayGroup[] {
    const groups = new Map<string, Menu[]>();

    for (const menu of this.menus) {
      const dateObj = new Date(menu.availableAt);
      if (!isWithinInterval(dateObj, this.weekStart, this.weekEnd)) {
        continue;
      }

      const dateKey = toDateKey(dateObj);
      const existing = groups.get(dateKey) ?? [];
      existing.push(menu);
      groups.set(dateKey, existing);
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([dateKey, menus]) => ({ dateKey, menus }));
  }

  get hasMenusThisWeek(): boolean {
    return this.dayGroups.length > 0;
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
          console.error('Failed to load planning menus:', err);
        },
      });
  }

  prevWeek(): void {
    this.weekOffset -= 1;
  }

  nextWeek(): void {
    this.weekOffset += 1;
  }

  goToToday(): void {
    this.weekOffset = 0;
  }

  getDateLabel(dateKey: string): string {
    const dateObj = new Date(`${dateKey}T12:00:00`);
    if (isToday(dateObj)) {
      return this.translate.instant('PLANNING.TODAY');
    }
    if (isTomorrow(dateObj)) {
      return this.translate.instant('PLANNING.TOMORROW');
    }
    return formatWeekdayDate(dateObj, this.getLocale());
  }

  navigateToEdit(menu: Menu): void {
    this.router.navigate(['/app/menus', menu.id]);
  }

  navigateToCreate(): void {
    this.router.navigate(['/app/menus'], { queryParams: { create: '1' } });
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(price);
  }

  getDishDescription(menu: Menu): string {
    return menu.mainCourse?.description || menu.mainCourse?.name || '—';
  }

  getImageUrl(path: string | null): string {
    return path || '';
  }

  private getLocale(): string {
    const lang = this.translate.currentLang || 'fr';
    const map: Record<string, string> = {
      fr: 'fr-CH',
      en: 'en-GB',
      de: 'de-CH',
      it: 'it-CH',
    };
    return map[lang] ?? 'fr-CH';
  }
}
