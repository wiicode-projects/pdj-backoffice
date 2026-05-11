import { Component, OnInit, OnDestroy, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  StatisticsApiService,
  RevenueKpis,
  SubscriberBreakdown,
  MonthlyComparison,
  YearlyComparison,
} from '../../core/services/statistics-api.service';

@Component({
  selector: 'pdj-statistics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './statistics.html',
  styleUrl: './statistics.scss',
})
export class Statistics implements OnInit, AfterViewInit, OnDestroy {

  // ── Filters ────────────────────────────────────────────────────────────────
  selectedPeriod: 'monthly' | 'yearly' = 'monthly';
  selectedYear  = new Date().getFullYear();
  selectedMonth = new Date().getMonth() + 1;

  years  = [2024, 2025, 2026];
  months = [
    { value: 1, label: 'Janvier' },  { value: 2,  label: 'Février' },
    { value: 3, label: 'Mars' },     { value: 4,  label: 'Avril' },
    { value: 5, label: 'Mai' },      { value: 6,  label: 'Juin' },
    { value: 7, label: 'Juillet' },  { value: 8,  label: 'Août' },
    { value: 9, label: 'Septembre' },{ value: 10, label: 'Octobre' },
    { value: 11, label: 'Novembre' },{ value: 12, label: 'Décembre' },
  ];

  // ── State ──────────────────────────────────────────────────────────────────
  loading = true;
  error: string | null = null;

  kpis: RevenueKpis = {
    revenuePaidCurrentPeriod: 0,
    totalRevenuePaid:         0,
    revenueForecast:          0,
    pendingInvoicesCount:     0,
    pendingInvoicesTotal:     0,
    totalActiveSubscribers:   0,
  };

  subscriberBreakdown: SubscriberBreakdown[] = [];
  monthlyComparison:   MonthlyComparison[]   = [];
  yearlyComparison:    YearlyComparison[]     = [];

  // ── Animated KPI counters ──────────────────────────────────────────────────
  animKpis = [0, 0, 0, 0];
  kpiTargets = [0, 0, 0, 0];

  readonly kpiCards = [
    { label: 'CA Réel (période)',    key: 'revenuePaidCurrentPeriod', icon: 'revenue',  color: '#10B981', suffix: ' CHF', bgAlpha: '22' },
    { label: 'CA Total Cumulé',      key: 'totalRevenuePaid',          icon: 'total',    color: '#3B82F6', suffix: ' CHF', bgAlpha: '18' },
    { label: 'Prévisions',           key: 'revenueForecast',           icon: 'forecast', color: '#8B5CF6', suffix: ' CHF', bgAlpha: '18' },
    { label: 'Factures en attente',  key: 'pendingInvoicesCount',      icon: 'pending',  color: '#F59E0B', suffix: '',     bgAlpha: '18' },
  ];

  // Donut segments
  donutSegments: { offset: number; dash: number; color: string; name: string }[] = [];

  private animationFrameId: number | null = null;

  constructor(
    private cdr: ChangeDetectorRef,
    private statsApi: StatisticsApiService,
  ) {}

  ngOnInit(): void { this.load(); }
  ngAfterViewInit(): void {}
  ngOnDestroy(): void { if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId); }

  // ── Data loading ──────────────────────────────────────────────────────────
  load(): void {
    this.loading = true;
    this.error   = null;
    const month  = this.selectedPeriod === 'monthly' ? this.selectedMonth : undefined;

    this.statsApi.getRevenue(this.selectedPeriod, this.selectedYear, month)
      .pipe(finalize(() => { this.loading = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (res) => {
          this.kpis                = res.kpis;
          this.subscriberBreakdown = res.subscriberBreakdown;
          this.monthlyComparison   = res.monthlyComparison;
          this.yearlyComparison    = res.yearlyComparison;

          this.kpiTargets = [
            res.kpis.revenuePaidCurrentPeriod,
            res.kpis.totalRevenuePaid,
            res.kpis.revenueForecast,
            res.kpis.pendingInvoicesCount,
          ];

          this.computeDonutSegments();
          this.animateKpis();
          this.cdr.detectChanges();
        },
        error: (e) => {
          this.error = 'Impossible de charger les statistiques.';
          console.error(e);
          this.cdr.detectChanges();
        },
      });
  }

  onPeriodChange(): void { this.load(); }
  onFilterChange(): void { this.load(); }

  // ── Chart helpers ──────────────────────────────────────────────────────────
  get chartData(): (MonthlyComparison | YearlyComparison)[] {
    return this.selectedPeriod === 'monthly' ? this.monthlyComparison : this.yearlyComparison;
  }

  get chartLabels(): string[] {
    if (this.selectedPeriod === 'monthly') return this.monthlyComparison.map(d => d.month);
    return this.yearlyComparison.map(d => String(d.year));
  }

  get chartPaidValues(): number[] {
    if (this.selectedPeriod === 'monthly') return this.monthlyComparison.map(d => d.paid);
    return this.yearlyComparison.map(d => d.paid);
  }

  get chartPendingValues(): number[] {
    if (this.selectedPeriod === 'monthly') return this.monthlyComparison.map(d => d.pending);
    return this.yearlyComparison.map(d => d.pending);
  }

  get maxBarValue(): number {
    const all = [...this.chartPaidValues, ...this.chartPendingValues];
    return all.length ? Math.max(...all) : 1;
  }

  get totalMonthlyRevenue(): number {
    return this.subscriberBreakdown.reduce((s, b) => s + b.monthlyRevenue, 0);
  }

  get breakdownWithPercentage(): (SubscriberBreakdown & { percentage: number })[] {
    const total = this.subscriberBreakdown.reduce((s, b) => s + b.count, 0);
    return this.subscriberBreakdown.map(b => ({
      ...b,
      percentage: total > 0 ? Math.round((b.count / total) * 100) : 0,
    }));
  }

  get totalActiveSubscribers(): number {
    return this.kpis.totalActiveSubscribers;
  }

  computeDonutSegments(): void {
    const total = this.subscriberBreakdown.reduce((s, b) => s + b.count, 0);
    if (!total) { this.donutSegments = []; return; }
    const circumference = 2 * Math.PI * 54;
    let offset = 0;
    this.donutSegments = this.subscriberBreakdown.map(b => {
      const dash = (b.count / total) * circumference;
      const seg  = { offset, dash, color: b.color, name: b.name };
      offset += dash;
      return seg;
    });
  }

  private animateKpis(): void {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    const duration = 1400;
    const start    = performance.now();
    const easeOut  = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased    = easeOut(progress);
      this.animKpis  = this.kpiTargets.map(v => Math.round(eased * v));
      this.cdr.detectChanges();
      if (progress < 1) this.animationFrameId = requestAnimationFrame(tick);
    };
    this.animationFrameId = requestAnimationFrame(tick);
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('fr-CH');
  }

  barHeightPercent(value: number): number {
    return this.maxBarValue > 0 ? (value / this.maxBarValue) * 100 : 0;
  }

  getArcPath(index: number): string {
    const cx = 64, cy = 64, r = 54;
    const total = this.subscriberBreakdown.reduce((s, b) => s + b.count, 0);
    if (!total) return '';
    let startAngle = -Math.PI / 2;
    for (let i = 0; i < index; i++) {
      startAngle += (this.subscriberBreakdown[i].count / total) * 2 * Math.PI;
    }
    const sweep    = (this.subscriberBreakdown[index].count / total) * 2 * Math.PI;
    const endAngle = startAngle + sweep;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = sweep > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  }
}
