import { Component, OnInit, OnDestroy, ChangeDetectorRef, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  StatisticsApiService,
  RevenueKpis,
  RevenueSource,
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
  selectedSource: RevenueSource = 'all';

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
  exporting = false;
  error: string | null = null;

  private readonly EXPORT_STORAGE_KEY = 'pdj_stats_export_history';

  /** Returns true if there is NO export logged for the current real month */
  get showExportWarning(): boolean {
    const key = this.currentMonthKey;
    try {
      const history = JSON.parse(localStorage.getItem(this.EXPORT_STORAGE_KEY) || '{}');
      return !history[key];
    } catch { return true; }
  }

  /** e.g. '2026-05' */
  private get currentMonthKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private trackExport(): void {
    try {
      const history = JSON.parse(localStorage.getItem(this.EXPORT_STORAGE_KEY) || '{}');
      history[this.currentMonthKey] = new Date().toISOString();
      localStorage.setItem(this.EXPORT_STORAGE_KEY, JSON.stringify(history));
      this.cdr.detectChanges();
    } catch {}
  }

  kpis: RevenueKpis = {
    revenuePaidCurrentPeriod: 0,
    totalRevenuePaid:         0,
    revenueForecast:          0,
    pendingInvoicesCount:     0,
    pendingInvoicesTotal:     0,
    totalActiveSubscribers:   0,
    packRevenuePeriod:        0,
    packRevenueTotal:         0,
    packPurchaseCount:        0,
    subRevenuePeriod:         0,
    subRevenueTotal:          0,
  };

  subscriberBreakdown: SubscriberBreakdown[] = [];
  monthlyComparison:   MonthlyComparison[]   = [];
  yearlyComparison:    YearlyComparison[]     = [];

  // ── Animated KPI counters ──────────────────────────────────────────────────
  animKpis = [0, 0, 0, 0, 0];
  kpiTargets = [0, 0, 0, 0, 0];

  readonly kpiCards = [
    { label: 'CA Réel (période)',    key: 'revenuePaidCurrentPeriod', icon: 'revenue',  color: '#10B981', suffix: ' CHF', bgAlpha: '22', tooltip: 'Chiffre d\'affaires encaissé pour la période (abonnements + packs de frites selon le filtre actif).' },
    { label: 'CA Total Cumulé',      key: 'totalRevenuePaid',          icon: 'total',    color: '#3B82F6', suffix: ' CHF', bgAlpha: '18', tooltip: 'Somme de tous les revenus encaissés depuis le lancement, incluant abonnements et ventes de packs.' },
    { label: 'Prévisions',           key: 'revenueForecast',           icon: 'forecast', color: '#8B5CF6', suffix: ' CHF', bgAlpha: '18', tooltip: 'Projection totale : CA réel de la période + montant des factures en attente de paiement.' },
    { label: 'Factures en attente',  key: 'pendingInvoicesCount',      icon: 'pending',  color: '#F59E0B', suffix: '',     bgAlpha: '18', tooltip: 'Nombre de factures d\'abonnement émises mais pas encore réglées.' },
    { label: 'Achats de packs',      key: 'packPurchaseCount',         icon: 'packs',    color: '#EC4899', suffix: '',     bgAlpha: '18', tooltip: 'Nombre total de packs de frites achetés par les utilisateurs depuis le lancement.' },
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

    this.statsApi.getRevenue(this.selectedPeriod, this.selectedYear, month, this.selectedSource)
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
            res.kpis.packPurchaseCount,
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

  // ── PDF Export ───────────────────────────────────────────────────────────
  async exportPdf(): Promise<void> {
    this.exporting = true;
    this.cdr.detectChanges();

    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const W = pdf.internal.pageSize.getWidth();
      const H = pdf.internal.pageSize.getHeight();
      const margin = 16;
      const contentW = W - margin * 2;
      let y = margin;

      const sourceLabel = this.selectedSource === 'all' ? 'Tout' : this.selectedSource === 'subscriptions' ? 'Abonnements' : 'Packs';
      const periodLabel = this.selectedPeriod === 'monthly'
        ? `${this.months.find(m => m.value === +this.selectedMonth)?.label ?? ''} ${this.selectedYear}`
        : `Année ${this.selectedYear}`;
      const exportDate = new Date().toLocaleDateString('fr-CH', { day: '2-digit', month: 'long', year: 'numeric' });

      const ensureSpace = (needed: number) => {
        if (y + needed > H - 20) { pdf.addPage(); y = margin; }
      };

      const roundRect = (rx: number, ry: number, w: number, h: number, r: number, fill: number[]) => {
        pdf.setFillColor(fill[0], fill[1], fill[2]);
        pdf.roundedRect(rx, ry, w, h, r, r, 'F');
      };

      const drawDivider = (dy: number) => {
        pdf.setDrawColor(229, 231, 235);
        pdf.setLineWidth(0.3);
        pdf.line(margin, dy, W - margin, dy);
      };

      // ─── HEADER BANNER ──────────────────────────────────────────────────
      roundRect(margin, y, contentW, 28, 4, [220, 38, 38]);
      pdf.setFontSize(16);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Plat du Jour \u2014 Rapport Statistiques', margin + 8, y + 11);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Export\u00e9 le ${exportDate}`, margin + 8, y + 20);
      y += 36;

      // ─── FILTRES APPLIQUÉS ──────────────────────────────────────────────
      roundRect(margin, y, contentW, 22, 3, [249, 250, 251]);

      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128);
      pdf.setFont('helvetica', 'bold');
      pdf.text('FILTRES APPLIQU\u00c9S', margin + 6, y + 6);

      pdf.setFontSize(8.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(55, 65, 81);

      const periodTypeLabel = this.selectedPeriod === 'monthly' ? 'Mensuel' : 'Annuel';
      const monthLabel = this.selectedPeriod === 'monthly'
        ? (this.months.find(m => m.value === +this.selectedMonth)?.label ?? '')
        : '\u2014';

      const filters = [
        { label: 'P\u00e9riode', value: periodTypeLabel },
        { label: 'Ann\u00e9e', value: `${this.selectedYear}` },
        { label: 'Mois', value: monthLabel },
        { label: 'Source', value: sourceLabel },
      ];

      const filterStartX = margin + 6;
      const filterSpacing = contentW / filters.length;
      for (let i = 0; i < filters.length; i++) {
        const fx = filterStartX + i * filterSpacing;
        pdf.setTextColor(156, 163, 175);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.text(filters[i].label, fx, y + 13);

        pdf.setTextColor(31, 41, 55);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.text(filters[i].value, fx, y + 19);
      }

      y += 28;

      // ─── SECTION 1: KPIs ────────────────────────────────────────────────
      pdf.setFontSize(13);
      pdf.setTextColor(31, 41, 55);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Indicateurs Cl\u00e9s', margin, y);
      y += 8;

      const kpiData = [
        { label: 'CA R\u00e9el (p\u00e9riode)', value: `${this.formatCurrency(this.kpis.revenuePaidCurrentPeriod)} CHF`, color: [16, 185, 129] },
        { label: 'CA Total Cumul\u00e9', value: `${this.formatCurrency(this.kpis.totalRevenuePaid)} CHF`, color: [59, 130, 246] },
        { label: 'Pr\u00e9visions', value: `${this.formatCurrency(this.kpis.revenueForecast)} CHF`, color: [139, 92, 246] },
        { label: 'Factures en attente', value: `${this.kpis.pendingInvoicesCount} (${this.formatCurrency(this.kpis.pendingInvoicesTotal)} CHF)`, color: [245, 158, 11] },
        { label: 'Achats de packs', value: `${this.kpis.packPurchaseCount} achats`, color: [236, 72, 153] },
      ];

      const colW = (contentW - 6) / 2;
      const cardH = 22;
      for (let i = 0; i < kpiData.length; i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        if (col === 0) ensureSpace(cardH + 4);
        const cx = margin + col * (colW + 6);
        const cy = y + row * (cardH + 4);

        roundRect(cx, cy, colW, cardH, 3, [249, 250, 251]);
        pdf.setFillColor(kpiData[i].color[0], kpiData[i].color[1], kpiData[i].color[2]);
        pdf.roundedRect(cx, cy, 3, cardH, 1.5, 1.5, 'F');

        pdf.setFontSize(8.5);
        pdf.setTextColor(107, 114, 128);
        pdf.setFont('helvetica', 'normal');
        pdf.text(kpiData[i].label, cx + 8, cy + 9);

        pdf.setFontSize(13);
        pdf.setTextColor(31, 41, 55);
        pdf.setFont('helvetica', 'bold');
        pdf.text(kpiData[i].value, cx + 8, cy + 18);
      }
      y += Math.ceil(kpiData.length / 2) * (cardH + 4) + 6;

      // ─── SOURCE BREAKDOWN (when combined) ───────────────────────────────
      if (this.selectedSource === 'all') {
        ensureSpace(35);
        drawDivider(y); y += 8;

        pdf.setFontSize(10);
        pdf.setTextColor(107, 114, 128);
        pdf.setFont('helvetica', 'bold');
        pdf.text('D\u00c9TAIL PAR SOURCE', margin, y);
        y += 6;

        y = this.pdfTable(pdf, [
          ['Source', 'P\u00e9riode', 'Total cumul\u00e9'],
          ['Abonnements', `${this.formatCurrency(this.kpis.subRevenuePeriod)} CHF`, `${this.formatCurrency(this.kpis.subRevenueTotal)} CHF`],
          ['Packs de frites', `${this.formatCurrency(this.kpis.packRevenuePeriod)} CHF`, `${this.formatCurrency(this.kpis.packRevenueTotal)} CHF`],
          ['Total combin\u00e9', `${this.formatCurrency(this.kpis.revenuePaidCurrentPeriod)} CHF`, `${this.formatCurrency(this.kpis.totalRevenuePaid)} CHF`],
        ], margin, y, contentW);
        y += 6;
      }

      // ─── SECTION 2: SUBSCRIBERS ─────────────────────────────────────────
      ensureSpace(40);
      drawDivider(y); y += 8;

      pdf.setFontSize(13);
      pdf.setTextColor(31, 41, 55);
      pdf.setFont('helvetica', 'bold');
      pdf.text('R\u00e9partition des Abonn\u00e9s', margin, y);
      pdf.setFontSize(9);
      pdf.setTextColor(107, 114, 128);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${this.kpis.totalActiveSubscribers} abonn\u00e9s actifs`, margin + 80, y);
      y += 6;

      if (this.breakdownWithPercentage.length > 0) {
        const subRows: string[][] = [['Formule', 'Abonn\u00e9s', 'Part', 'Revenu mensuel']];
        for (const item of this.breakdownWithPercentage) {
          subRows.push([item.name, `${item.count}`, `${item.percentage}%`, item.monthlyRevenue > 0 ? `${this.formatCurrency(item.monthlyRevenue)} CHF` : 'Gratuit']);
        }
        subRows.push(['Total', `${this.kpis.totalActiveSubscribers}`, '100%', `${this.formatCurrency(this.totalMonthlyRevenue)} CHF/mois`]);
        y = this.pdfTable(pdf, subRows, margin, y, contentW);
      } else {
        pdf.setFontSize(9); pdf.setTextColor(156, 163, 175);
        pdf.text('Aucun abonn\u00e9 actif.', margin, y + 4); y += 10;
      }
      y += 6;

      // ─── SECTION 3: COMPARISON TABLE ────────────────────────────────────
      ensureSpace(40);
      drawDivider(y); y += 8;

      const compTitle = this.selectedPeriod === 'monthly' ? 'Comparatif Mensuel (12 mois)' : 'Comparatif Annuel';
      pdf.setFontSize(13);
      pdf.setTextColor(31, 41, 55);
      pdf.setFont('helvetica', 'bold');
      pdf.text(compTitle, margin, y);
      y += 6;

      if (this.chartLabels.length > 0) {
        const compRows: string[][] = [['P\u00e9riode', 'Encaiss\u00e9 (CHF)', 'En attente (CHF)', 'Total (CHF)']];
        for (let i = 0; i < this.chartLabels.length; i++) {
          const paid = this.chartPaidValues[i] || 0;
          const pending = this.chartPendingValues[i] || 0;
          compRows.push([this.chartLabels[i], this.formatCurrency(paid), this.formatCurrency(pending), this.formatCurrency(paid + pending)]);
        }
        const tp = this.chartPaidValues.reduce((a, b) => a + b, 0);
        const tpn = this.chartPendingValues.reduce((a, b) => a + b, 0);
        compRows.push(['TOTAL', this.formatCurrency(tp), this.formatCurrency(tpn), this.formatCurrency(tp + tpn)]);
        y = this.pdfTable(pdf, compRows, margin, y, contentW);
      } else {
        pdf.setFontSize(9); pdf.setTextColor(156, 163, 175);
        pdf.text('Aucune donn\u00e9e comparative.', margin, y + 4); y += 10;
      }

      // ─── FOOTER ─────────────────────────────────────────────────────────
      const totalPages = pdf.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        pdf.setDrawColor(229, 231, 235); pdf.setLineWidth(0.3);
        pdf.line(margin, H - 12, W - margin, H - 12);
        pdf.setFontSize(7.5); pdf.setTextColor(156, 163, 175); pdf.setFont('helvetica', 'normal');
        pdf.text('Plat du Jour \u2014 Rapport g\u00e9n\u00e9r\u00e9 automatiquement', margin, H - 8);
        pdf.text(`Page ${p} / ${totalPages}`, W - margin - 20, H - 8);
      }

      pdf.save(`statistiques_${periodLabel.replace(/\s+/g, '_')}_${sourceLabel}.pdf`);
      this.trackExport();
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      this.exporting = false;
      this.cdr.detectChanges();
    }
  }

  /** Draw a table: first row = dark header, last row = bold total, zebra stripes */
  private pdfTable(pdf: any, rows: string[][], x: number, startY: number, tableW: number): number {
    const rowH = 8;
    const cols = rows[0].length;
    const cW = tableW / cols;
    const H = pdf.internal.pageSize.getHeight();
    let y = startY;

    for (let r = 0; r < rows.length; r++) {
      if (y + rowH > H - 20) { pdf.addPage(); y = 16; }

      const isHeader = r === 0;
      const isLast = r === rows.length - 1;

      if (isHeader) {
        pdf.setFillColor(31, 41, 55); pdf.rect(x, y, tableW, rowH, 'F');
        pdf.setTextColor(255, 255, 255); pdf.setFontSize(8); pdf.setFont('helvetica', 'bold');
      } else if (isLast) {
        pdf.setFillColor(243, 244, 246); pdf.rect(x, y, tableW, rowH, 'F');
        pdf.setTextColor(31, 41, 55); pdf.setFontSize(8.5); pdf.setFont('helvetica', 'bold');
      } else {
        if (r % 2 === 0) { pdf.setFillColor(249, 250, 251); pdf.rect(x, y, tableW, rowH, 'F'); }
        pdf.setTextColor(55, 65, 81); pdf.setFontSize(8); pdf.setFont('helvetica', 'normal');
      }

      for (let c = 0; c < cols; c++) {
        pdf.text(rows[r][c] || '', x + c * cW + 4, y + 5.5);
      }
      y += rowH;
    }
    return y;
  }
}
