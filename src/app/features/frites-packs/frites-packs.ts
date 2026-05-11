import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { FritesPackService, FritesPack } from '../../core/services/frites-pack.service';
import { environment } from '../../../environments/environment';

const BADGE_OPTIONS = ['', 'POPULAIRE', 'MEILLEUR OFFRE', 'NOUVEAU', 'PROMO'];

@Component({
  selector: 'pdj-frites-packs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './frites-packs.html',
  styleUrl: './frites-packs.scss',
})
export class FritesPacks implements OnInit {
  packs: FritesPack[] = [];
  loading = true;

  // Modal
  showModal    = false;
  editingPack: FritesPack | null = null;
  saving       = false;
  imagePreview: string | null = null;
  selectedFile: File | null = null;

  // Form (price entered in CHF by admin, stored as centimes)
  form = {
    name:         '',
    description:  '',
    fritesAmount: 0,
    priceCHF:     0,          // UI field — converted to centimes on save
    badgeLabel:   '',
    sortOrder:    0,
    isActive:     true,
  };

  // Delete
  confirmDeleteId: string | null = null;
  deleting = false;

  readonly badgeOptions = BADGE_OPTIONS;
  readonly apiBase = environment.apiUrl.replace('/api/v1', '');
  readonly formatPrice = FritesPackService.formatPrice;

  constructor(
    private packService: FritesPackService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void { this.load(); }

  // ── Data ──────────────────────────────────────────────────────────────────

  load(): void {
    this.loading = true;
    this.packService.findAll()
      .pipe(finalize(() => { this.loading = false; this.cdr.detectChanges(); }))
      .subscribe({ next: (r: { status: number; packs: FritesPack[] }) => { this.packs = r.packs; this.cdr.detectChanges(); } });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getImageUrl(pack: FritesPack): string | null {
    if (!pack.imagePath) return null;
    return `${this.apiBase}/${pack.imagePath}`;
  }

  badgeClass(label: string | null): string {
    if (!label) return '';
    const map: Record<string, string> = {
      'POPULAIRE':    'badge--red',
      'MEILLEUR OFFRE': 'badge--green',
      'NOUVEAU':      'badge--blue',
      'PROMO':        'badge--amber',
    };
    return map[label] ?? 'badge--blue';
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  openCreate(): void {
    this.editingPack  = null;
    this.imagePreview = null;
    this.selectedFile = null;
    this.form = { name: '', description: '', fritesAmount: 0, priceCHF: 0, badgeLabel: '', sortOrder: this.packs.length, isActive: true };
    this.showModal = true;
    this.cdr.detectChanges();
  }

  openEdit(pack: FritesPack): void {
    this.editingPack  = pack;
    this.selectedFile = null;
    this.imagePreview = this.getImageUrl(pack);
    this.form = {
      name:         pack.name,
      description:  pack.description ?? '',
      fritesAmount: pack.fritesAmount,
      priceCHF:     pack.priceCentimes / 100,
      badgeLabel:   pack.badgeLabel ?? '',
      sortOrder:    pack.sortOrder,
      isActive:     pack.isActive,
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
    if (!this.form.name.trim() || this.form.fritesAmount < 1 || this.form.priceCHF <= 0 || this.saving) return;

    const fd = new FormData();
    fd.append('name',          this.form.name);
    fd.append('description',   this.form.description);
    fd.append('fritesAmount',  String(this.form.fritesAmount));
    fd.append('priceCentimes', String(Math.round(this.form.priceCHF * 100)));
    fd.append('badgeLabel',    this.form.badgeLabel);
    fd.append('sortOrder',     String(this.form.sortOrder));
    fd.append('isActive',      String(this.form.isActive));
    if (this.selectedFile) fd.append('image', this.selectedFile);

    this.saving = true;
    const req$ = this.editingPack
      ? this.packService.update(this.editingPack.id, fd)
      : this.packService.create(fd);

    req$.subscribe({
      next: () => {
        this.saving    = false;
        this.showModal = false;
        this.cdr.detectChanges();
        this.load();
      },
      error: () => { this.saving = false; this.cdr.detectChanges(); },
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  askDelete(id: string): void  { this.confirmDeleteId = id; this.cdr.detectChanges(); }
  cancelDelete(): void         { this.confirmDeleteId = null; this.cdr.detectChanges(); }

  confirmDelete(id: string): void {
    this.deleting = true;
    this.packService.remove(id).subscribe({
      next: () => {
        this.deleting        = false;
        this.confirmDeleteId = null;
        this.cdr.detectChanges();
        this.load();
      },
      error: () => { this.deleting = false; this.cdr.detectChanges(); },
    });
  }

  isFormValid(): boolean {
    return !!this.form.name.trim() && this.form.fritesAmount >= 1 && this.form.priceCHF > 0;
  }
}
