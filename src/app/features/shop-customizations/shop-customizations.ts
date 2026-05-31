import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  CustomizationItem,
  CustomizationItemService,
  CustomizationCategory,
  CustomizationType,
  CUSTOMIZATION_TYPES,
  CUSTOMIZATION_TYPE_CATEGORIES,
} from '../../core/services/customization-item.service';
import { environment } from '../../../environments/environment';
import {
  IMPLEMENTED_EFFECT_KEYS,
  CatalogKeyOption,
} from '../../core/constants/customization-catalog-keys';

const CATEGORIES: CustomizationCategory[] = [
  'color_solid',
  'color_gradient',
  'color_pattern',
  'effect',
  'font',
  'sticker',
];

const BADGE_OPTIONS = ['', 'ÉDITION LIMITÉE', 'RARE', 'ÉPIQUE', 'NOUVEAU', 'POPULAIRE'];

@Component({
  selector: 'pdj-shop-customizations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './shop-customizations.html',
  styleUrl: './shop-customizations.scss',
})
export class ShopCustomizations implements OnInit {
  items: CustomizationItem[] = [];
  loading = true;
  filterType: CustomizationType | '' = '';

  showModal = false;
  editing: CustomizationItem | null = null;
  saving = false;
  imagePreview: string | null = null;
  selectedFile: File | null = null;

  form = {
    category: 'color_solid' as CustomizationCategory,
    itemKey: '',
    name: '',
    description: '',
    priceFrites: 0,
    isDefaultFree: false,
    sortOrder: 0,
    isActive: true,
    badgeLabel: '',
    isFeatured: false,
  };

  confirmDeleteId: string | null = null;
  deleting = false;

  readonly catalogCategories = CATEGORIES;
  readonly customizationTypes = CUSTOMIZATION_TYPES;
  readonly typeLabel = CustomizationItemService.typeLabel;
  readonly categoryLabel = CustomizationItemService.categoryLabel;
  readonly badgeOptions = BADGE_OPTIONS;
  readonly apiBase = environment.apiUrl.replace('/api/v1', '');

  constructor(
    private itemService: CustomizationItemService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get filteredItems(): CustomizationItem[] {
    if (!this.filterType) return this.items;
    const cats = CUSTOMIZATION_TYPE_CATEGORIES[this.filterType];
    return this.items.filter((i) => cats.includes(i.category));
  }

  typeLabelForCategory(category: CustomizationCategory): string {
    return CustomizationItemService.typeLabel(
      CustomizationItemService.typeForCategory(category),
    );
  }

  get showEffectKeySelect(): boolean {
    return this.form.category === 'effect' && !this.editing;
  }

  get availableEffectKeys(): CatalogKeyOption[] {
    const used = new Set(
      this.items
        .filter((i) => i.category === 'effect')
        .map((i) => i.itemKey),
    );
    return IMPLEMENTED_EFFECT_KEYS.filter((option) => !used.has(option.key));
  }

  onCategoryChange(): void {
    if (this.editing) return;

    if (this.form.category === 'effect') {
      this.form.itemKey = '';
      this.onEffectKeyChange();
      return;
    }

    this.form.itemKey = '';
  }

  onEffectKeyChange(): void {
    if (!this.showEffectKeySelect) return;

    const option = IMPLEMENTED_EFFECT_KEYS.find(
      (entry) => entry.key === this.form.itemKey,
    );
    if (option && !this.form.name.trim()) {
      this.form.name = option.label;
    }
  }

  load(): void {
    this.loading = true;
    this.itemService
      .findAll()
      .pipe(finalize(() => { this.loading = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (r) => {
          this.items = r.items;
          this.cdr.detectChanges();
        },
      });
  }

  getCoverUrl(item: CustomizationItem): string | null {
    if (!item.previewImagePath) return null;
    if (item.previewImagePath.startsWith('http')) return item.previewImagePath;
    const path = item.previewImagePath.replace(/^\.\//, '');
    return `${this.apiBase}/${path}`;
  }

  openCreate(): void {
    this.editing = null;
    this.imagePreview = null;
    this.selectedFile = null;
    this.form = {
      category: 'color_solid',
      itemKey: '',
      name: '',
      description: '',
      priceFrites: 100,
      isDefaultFree: false,
      sortOrder: this.items.length,
      isActive: true,
      badgeLabel: '',
      isFeatured: false,
    };
    this.showModal = true;
    this.cdr.detectChanges();
  }

  openEdit(item: CustomizationItem): void {
    this.editing = item;
    this.selectedFile = null;
    this.imagePreview = this.getCoverUrl(item);
    this.form = {
      category: item.category,
      itemKey: item.itemKey,
      name: item.name,
      description: item.description ?? '',
      priceFrites: item.priceFrites,
      isDefaultFree: item.isDefaultFree,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
      badgeLabel: item.badgeLabel ?? '',
      isFeatured: item.isFeatured,
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
    const file = input.files?.[0];
    if (!file) return;
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreview = e.target?.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  save(): void {
    if (!this.form.name.trim() || !this.form.itemKey.trim() || this.saving) return;

    const fd = new FormData();
    fd.append('category', this.form.category);
    fd.append('itemKey', this.form.itemKey);
    fd.append('name', this.form.name);
    fd.append('description', this.form.description);
    fd.append('priceFrites', String(this.form.priceFrites));
    fd.append('isDefaultFree', String(this.form.isDefaultFree));
    fd.append('sortOrder', String(this.form.sortOrder));
    fd.append('isActive', String(this.form.isActive));
    fd.append('badgeLabel', this.form.badgeLabel);
    fd.append('isFeatured', String(this.form.isFeatured));
    if (this.selectedFile) fd.append('image', this.selectedFile);

    this.saving = true;
    const req$ = this.editing
      ? this.itemService.update(this.editing.id, fd)
      : this.itemService.create(fd);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.showModal = false;
        this.cdr.detectChanges();
        this.load();
      },
      error: (err) => {
        this.saving = false;
        this.cdr.detectChanges();
        const msg =
          err?.error?.message ??
          (Array.isArray(err?.error?.message)
            ? err.error.message.join(', ')
            : 'Enregistrement échoué. Vérifiez les champs ou réessayez.');
        alert(typeof msg === 'string' ? msg : JSON.stringify(msg));
      },
    });
  }

  askDelete(id: string): void {
    this.confirmDeleteId = id;
    this.cdr.detectChanges();
  }

  cancelDelete(): void {
    this.confirmDeleteId = null;
    this.cdr.detectChanges();
  }

  confirmDelete(id: string): void {
    this.deleting = true;
    this.itemService.remove(id).subscribe({
      next: () => {
        this.deleting = false;
        this.confirmDeleteId = null;
        this.cdr.detectChanges();
        this.load();
      },
      error: () => {
        this.deleting = false;
        this.cdr.detectChanges();
      },
    });
  }

  isFormValid(): boolean {
    if (!this.form.name.trim() || !this.form.itemKey.trim()) return false;

    if (this.showEffectKeySelect) {
      const allowed = this.availableEffectKeys.some(
        (option) => option.key === this.form.itemKey,
      );
      if (!allowed) return false;
    }

    return true;
  }
}
