import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { AdService, Ad, AdPosition } from '../../core/services/ad.service';
import { environment } from '../../../environments/environment';

const POSITION_LABELS: Record<AdPosition, string> = {
  HOME_BANNER:       'Bandeau accueil',
  SEARCH_TOP:        'Haut de recherche',
  HOME_INTERSTITIAL: 'Interstitiel accueil',
};

@Component({
  selector: 'pdj-ads',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './ads.html',
  styleUrl: './ads.scss',
})
export class Ads implements OnInit {
  ads: Ad[] = [];
  loading = true;

  // Modal state
  showModal   = false;
  editingAd: Ad | null = null;
  saving      = false;
  imagePreview: string | null = null;
  selectedFile: File | null = null;

  // Form
  form = {
    title:       '',
    description: '',
    targetUrl:   '',
    position:    'HOME_BANNER' as AdPosition,
    isActive:    true,
    startDate:   '',
    endDate:     '',
  };

  // Delete
  confirmDeleteId: string | null = null;
  deleting = false;

  readonly positions: AdPosition[] = ['HOME_BANNER', 'SEARCH_TOP', 'HOME_INTERSTITIAL'];
  readonly positionLabel = POSITION_LABELS;
  readonly apiBase = environment.apiUrl.replace('/api/v1', '');

  constructor(
    private adService: AdService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void { this.load(); }

  // ── Load ─────────────────────────────────────────────────────────────────────

  load(): void {
    this.loading = true;
    this.adService.findAll()
      .pipe(finalize(() => { this.loading = false; this.cdr.detectChanges(); }))
      .subscribe({ next: (r: { status: number; ads: Ad[] }) => { this.ads = r.ads; this.cdr.detectChanges(); } });
  }

  // ── Stats helpers ──────────────────────────────────────────────────────────

  getCtr(ad: Ad): string {
    if (!ad.impressions) return '—';
    return ((ad.clicks / ad.impressions) * 100).toFixed(1) + '%';
  }

  getStatus(ad: Ad): 'active' | 'scheduled' | 'expired' | 'inactive' {
    if (!ad.isActive) return 'inactive';
    const now = new Date();
    if (ad.startDate && new Date(ad.startDate) > now) return 'scheduled';
    if (ad.endDate   && new Date(ad.endDate)   < now) return 'expired';
    return 'active';
  }

  getStatusLabel(ad: Ad): string {
    const map = { active: 'Actif', scheduled: 'Planifié', expired: 'Expiré', inactive: 'Inactif' };
    return map[this.getStatus(ad)];
  }

  getImageUrl(ad: Ad): string | null {
    if (!ad.imagePath) return null;
    return `${this.apiBase}/${ad.imagePath}`;
  }

  // ── Modal ─────────────────────────────────────────────────────────────────────

  openCreate(): void {
    this.editingAd    = null;
    this.imagePreview = null;
    this.selectedFile = null;
    this.form = { title: '', description: '', targetUrl: '', position: 'HOME_BANNER', isActive: true, startDate: '', endDate: '' };
    this.showModal = true;
    this.cdr.detectChanges();
  }

  openEdit(ad: Ad): void {
    this.editingAd    = ad;
    this.selectedFile = null;
    this.imagePreview = this.getImageUrl(ad);
    this.form = {
      title:       ad.title,
      description: ad.description ?? '',
      targetUrl:   ad.targetUrl   ?? '',
      position:    ad.position,
      isActive:    ad.isActive,
      startDate:   ad.startDate ? ad.startDate.substring(0, 10) : '',
      endDate:     ad.endDate   ? ad.endDate.substring(0, 10)   : '',
    };
    this.showModal = true;
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.showModal = false;
    this.cdr.detectChanges();
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => { this.imagePreview = e.target?.result as string; this.cdr.detectChanges(); };
    reader.readAsDataURL(file);
  }

  save(): void {
    if (!this.form.title.trim() || this.saving) return;
    this.saving = true;

    const fd = new FormData();
    fd.append('title',       this.form.title);
    fd.append('description', this.form.description);
    fd.append('targetUrl',   this.form.targetUrl);
    fd.append('position',    this.form.position);
    fd.append('isActive',    String(this.form.isActive));
    if (this.form.startDate) fd.append('startDate', new Date(this.form.startDate).toISOString());
    if (this.form.endDate)   fd.append('endDate',   new Date(this.form.endDate).toISOString());
    if (this.selectedFile)   fd.append('image', this.selectedFile);

    const req$ = this.editingAd
      ? this.adService.update(this.editingAd.id, fd)
      : this.adService.create(fd);

    req$.subscribe({
      next: () => {
        this.saving    = false;
        this.showModal = false;
        this.cdr.detectChanges();
        this.load();
      },
      error: () => {
        this.saving = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────────

  askDelete(id: string): void  { this.confirmDeleteId = id; this.cdr.detectChanges(); }
  cancelDelete(): void         { this.confirmDeleteId = null; this.cdr.detectChanges(); }

  confirmDelete(id: string): void {
    this.deleting = true;
    this.adService.remove(id).subscribe({
      next: () => {
        this.deleting          = false;
        this.confirmDeleteId   = null;
        this.cdr.detectChanges();
        this.load();
      },
      error: () => {
        this.deleting = false;
        this.cdr.detectChanges();
      },
    });
  }
}
