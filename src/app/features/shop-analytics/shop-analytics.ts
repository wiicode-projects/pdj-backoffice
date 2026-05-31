import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { ShopAnalyticsService, ShopAnalyticsData } from '../../core/services/shop-analytics.service';

const TX_LABELS: Record<string, string> = {
  PACK_PURCHASE: 'Achat pack', ITEM_PURCHASE: 'Achat article',
  EVENT_REWARD: 'Récompense', LOGIN_BONUS: 'Connexion',
  MINIGAME_WIN: 'Mini-jeu', ADMIN_ADJUST: 'Admin', PROMO: 'Promo',
};

@Component({
  selector: 'pdj-shop-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shop-analytics.html',
  styleUrl: './shop-analytics.scss',
})
export class ShopAnalytics implements OnInit {
  analytics: ShopAnalyticsData | null = null;
  loading = true;

  readonly txLabels = TX_LABELS;

  constructor(
    private analyticsService: ShopAnalyticsService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.analyticsService.getAnalytics()
      .pipe(finalize(() => { this.loading = false; this.cdr.detectChanges(); }))
      .subscribe({ next: (r: any) => { this.analytics = r.analytics; this.cdr.detectChanges(); } });
  }

  /** % of emitted Frites that have been spent */
  get burnRate(): string {
    if (!this.analytics?.totalEmitted) return '0%';
    return ((this.analytics.totalSpent / this.analytics.totalEmitted) * 100).toFixed(1) + '%';
  }

  /** Economy health: what % of emitted Frites are still in circulation */
  get circulationRate(): string {
    if (!this.analytics?.totalEmitted) return '100%';
    return ((this.analytics.totalCirculation / this.analytics.totalEmitted) * 100).toFixed(1) + '%';
  }

  getInitials(w: { firstName: string; lastName: string }): string {
    return ((w.firstName?.[0] ?? '') + (w.lastName?.[0] ?? '')).toUpperCase() || '?';
  }
}
