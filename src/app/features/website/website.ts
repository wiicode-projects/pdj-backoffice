import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import {
  WebsiteService,
  Testimonial,
  FaqItem,
  FaqLocale,
  FaqItemTranslations,
  LandingStatPreview,
} from '../../core/services/website.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'pdj-website',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './website.html',
  styleUrl: './website.scss',
})
export class Website implements OnInit {
  loading = true;
  savingVisibility = false;
  savingStats = false;
  syncingStats = false;
  visibilitySuccess = false;
  visibilityError = '';
  statsSuccess = false;
  statsError = '';

  statsSectionEnabled = false;
  testimonialsSectionEnabled = false;
  faqSectionEnabled = false;
  statsPreview: LandingStatPreview[] = [];

  testimonials: Testimonial[] = [];
  loadingTestimonials = true;

  faqItems: FaqItem[] = [];
  loadingFaqItems = true;

  showModal = false;
  editing: Testimonial | null = null;
  saving = false;
  imagePreview: string | null = null;
  selectedFile: File | null = null;

  form = {
    name: '',
    role: '',
    location: '',
    quote: '',
    rating: 5,
    isActive: true,
  };

  confirmDeleteId: string | null = null;
  deleting = false;

  showFaqModal = false;
  editingFaq: FaqItem | null = null;
  savingFaq = false;
  faqActiveTab: FaqLocale = 'fr';
  confirmDeleteFaqId: string | null = null;
  deletingFaq = false;

  readonly faqLocales: { code: FaqLocale; label: string }[] = [
    { code: 'fr', label: 'Français' },
    { code: 'en', label: 'English' },
    { code: 'de', label: 'Deutsch' },
    { code: 'it', label: 'Italiano' },
  ];

  faqForm: FaqItemTranslations = this.emptyFaqTranslations();
  faqIsActive = true;

  readonly apiBase = environment.apiUrl.replace('/api/v1', '');

  constructor(
    private websiteService: WebsiteService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadSettings();
    this.loadTestimonials();
    this.loadFaqItems();
  }

  private emptyFaqTranslations(): FaqItemTranslations {
    return {
      fr: { question: '', answer: '' },
      en: { question: '', answer: '' },
      de: { question: '', answer: '' },
      it: { question: '', answer: '' },
    };
  }

  loadSettings(): void {
    this.loading = true;
    this.websiteService.getSettings()
      .pipe(finalize(() => { this.loading = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (settings) => {
          this.statsSectionEnabled = settings.statsSectionEnabled;
          this.testimonialsSectionEnabled = settings.testimonialsSectionEnabled;
          this.faqSectionEnabled = settings.faqSectionEnabled;
          this.statsPreview = settings.statsPreview ?? [];
          this.cdr.detectChanges();
        },
        error: () => {
          this.visibilityError = 'Impossible de charger les paramètres du site.';
          this.cdr.detectChanges();
        },
      });
  }

  loadTestimonials(): void {
    this.loadingTestimonials = true;
    this.websiteService.findAllTestimonials()
      .pipe(finalize(() => { this.loadingTestimonials = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (r) => {
          this.testimonials = r.testimonials;
          this.cdr.detectChanges();
        },
      });
  }

  loadFaqItems(): void {
    this.loadingFaqItems = true;
    this.websiteService.findAllFaqItems()
      .pipe(finalize(() => { this.loadingFaqItems = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (r) => {
          this.faqItems = r.faqItems;
          this.cdr.detectChanges();
        },
      });
  }

  saveVisibility(): void {
    if (this.savingVisibility) return;
    this.savingVisibility = true;
    this.visibilitySuccess = false;
    this.visibilityError = '';

    this.websiteService.updateVisibility({
      statsSectionEnabled: this.statsSectionEnabled,
      testimonialsSectionEnabled: this.testimonialsSectionEnabled,
      faqSectionEnabled: this.faqSectionEnabled,
    }).pipe(finalize(() => {
      this.savingVisibility = false;
      this.cdr.detectChanges();
    })).subscribe({
      next: (settings) => {
        this.statsSectionEnabled = settings.statsSectionEnabled;
        this.testimonialsSectionEnabled = settings.testimonialsSectionEnabled;
        this.faqSectionEnabled = settings.faqSectionEnabled;
        this.visibilitySuccess = true;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.visibilitySuccess = false;
          this.cdr.detectChanges();
        }, 2500);
      },
      error: () => {
        this.visibilityError = 'Erreur lors de la sauvegarde.';
        this.cdr.detectChanges();
      },
    });
  }

  readonly statLabels: Record<LandingStatPreview['key'], string> = {
    downloads: 'Téléchargements',
    restaurants: 'Restaurants',
    menusServed: 'Menus servis',
    averageRating: 'Note moyenne',
  };

  saveStats(): void {
    if (this.savingStats || this.statsPreview.length === 0) return;

    const downloads = this.statsPreview.find((s) => s.key === 'downloads');
    const restaurants = this.statsPreview.find((s) => s.key === 'restaurants');
    const menusServed = this.statsPreview.find((s) => s.key === 'menusServed');
    const averageRating = this.statsPreview.find((s) => s.key === 'averageRating');
    if (!downloads || !restaurants || !menusServed || !averageRating) return;

    this.savingStats = true;
    this.statsSuccess = false;
    this.statsError = '';

    this.websiteService.updateStats({
      statsDownloads: Math.max(0, Math.floor(downloads.val)),
      statsRestaurants: Math.max(0, Math.floor(restaurants.val)),
      statsMenusServed: Math.max(0, Math.floor(menusServed.val)),
      statsAverageRating: Math.min(5, Math.max(0, averageRating.val)),
    }).pipe(finalize(() => {
      this.savingStats = false;
      this.cdr.detectChanges();
    })).subscribe({
      next: (settings) => {
        this.statsPreview = settings.statsPreview ?? [];
        this.statsSuccess = true;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.statsSuccess = false;
          this.cdr.detectChanges();
        }, 2500);
      },
      error: () => {
        this.statsError = 'Erreur lors de la sauvegarde des statistiques.';
        this.cdr.detectChanges();
      },
    });
  }

  syncStatsFromDatabase(): void {
    if (this.syncingStats) return;
    this.syncingStats = true;
    this.statsError = '';

    this.websiteService.syncStatsFromDatabase()
      .pipe(finalize(() => {
        this.syncingStats = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (settings) => {
          this.statsPreview = settings.statsPreview ?? [];
          this.statsSuccess = true;
          this.cdr.detectChanges();
          setTimeout(() => {
            this.statsSuccess = false;
            this.cdr.detectChanges();
          }, 2500);
        },
        error: () => {
          this.statsError = 'Impossible de synchroniser depuis la base.';
          this.cdr.detectChanges();
        },
      });
  }

  formatStatValue(stat: LandingStatPreview): string {
    const value = stat.isDecimal ? stat.val.toFixed(1) : stat.val.toLocaleString('fr-CH');
    return `${value}${stat.suffix}`;
  }

  getImageUrl(item: Testimonial): string | null {
    if (item.imageUrl) return item.imageUrl;
    if (!item.imagePath) return null;
    const path = item.imagePath.replace(/^\.\//, '');
    return `${this.apiBase}/${path}`;
  }

  openCreate(): void {
    this.editing = null;
    this.imagePreview = null;
    this.selectedFile = null;
    this.form = { name: '', role: '', location: '', quote: '', rating: 5, isActive: true };
    this.showModal = true;
    this.cdr.detectChanges();
  }

  openEdit(item: Testimonial): void {
    this.editing = item;
    this.selectedFile = null;
    this.imagePreview = this.getImageUrl(item);
    this.form = {
      name: item.name,
      role: item.role,
      location: item.location,
      quote: item.quote,
      rating: item.rating,
      isActive: item.isActive,
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
    if (!this.form.name.trim() || !this.form.quote.trim() || this.saving) return;
    this.saving = true;

    const fd = new FormData();
    fd.append('name', this.form.name);
    fd.append('role', this.form.role);
    fd.append('location', this.form.location);
    fd.append('quote', this.form.quote);
    fd.append('rating', String(this.form.rating));
    fd.append('isActive', String(this.form.isActive));
    if (this.selectedFile) fd.append('image', this.selectedFile);

    const req$ = this.editing
      ? this.websiteService.update(this.editing.id, fd)
      : this.websiteService.create(fd);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.showModal = false;
        this.cdr.detectChanges();
        this.loadTestimonials();
      },
      error: () => {
        this.saving = false;
        this.cdr.detectChanges();
      },
    });
  }

  moveTestimonial(item: Testimonial, direction: -1 | 1): void {
    const index = this.testimonials.findIndex((t) => t.id === item.id);
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= this.testimonials.length) return;

    const swap = this.testimonials[swapIndex];
    const fd = new FormData();
    fd.append('sortOrder', String(swap.sortOrder));
    fd.append('name', item.name);
    fd.append('role', item.role);
    fd.append('location', item.location);
    fd.append('quote', item.quote);
    fd.append('rating', String(item.rating));
    fd.append('isActive', String(item.isActive));

    const fdSwap = new FormData();
    fdSwap.append('sortOrder', String(item.sortOrder));
    fdSwap.append('name', swap.name);
    fdSwap.append('role', swap.role);
    fdSwap.append('location', swap.location);
    fdSwap.append('quote', swap.quote);
    fdSwap.append('rating', String(swap.rating));
    fdSwap.append('isActive', String(swap.isActive));

    this.websiteService.update(item.id, fd).subscribe({
      next: () => {
        this.websiteService.update(swap.id, fdSwap).subscribe({
          next: () => this.loadTestimonials(),
        });
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
    this.websiteService.remove(id).subscribe({
      next: () => {
        this.deleting = false;
        this.confirmDeleteId = null;
        this.cdr.detectChanges();
        this.loadTestimonials();
      },
      error: () => {
        this.deleting = false;
        this.cdr.detectChanges();
      },
    });
  }

  openCreateFaq(): void {
    this.editingFaq = null;
    this.faqActiveTab = 'fr';
    this.faqForm = this.emptyFaqTranslations();
    this.faqIsActive = true;
    this.showFaqModal = true;
    this.cdr.detectChanges();
  }

  openEditFaq(item: FaqItem): void {
    this.editingFaq = item;
    this.faqActiveTab = 'fr';
    this.faqForm = {
      fr: { ...item.translations.fr },
      en: { ...item.translations.en },
      de: { ...item.translations.de },
      it: { ...item.translations.it },
    };
    this.faqIsActive = item.isActive;
    this.showFaqModal = true;
    this.cdr.detectChanges();
  }

  closeFaqModal(): void {
    this.showFaqModal = false;
    this.cdr.detectChanges();
  }

  isFaqFormValid(): boolean {
    return this.faqLocales.every(
      ({ code }) =>
        this.faqForm[code].question.trim().length > 0 &&
        this.faqForm[code].answer.trim().length > 0,
    );
  }

  saveFaq(): void {
    if (!this.isFaqFormValid() || this.savingFaq) return;
    this.savingFaq = true;

    const payload = {
      translations: this.faqForm,
      isActive: this.faqIsActive,
    };

    const req$ = this.editingFaq
      ? this.websiteService.updateFaqItem(this.editingFaq.id, payload)
      : this.websiteService.createFaqItem(payload);

    req$.subscribe({
      next: () => {
        this.savingFaq = false;
        this.showFaqModal = false;
        this.cdr.detectChanges();
        this.loadFaqItems();
      },
      error: () => {
        this.savingFaq = false;
        this.cdr.detectChanges();
      },
    });
  }

  moveFaqItem(item: FaqItem, direction: -1 | 1): void {
    const index = this.faqItems.findIndex((f) => f.id === item.id);
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= this.faqItems.length) return;

    const swap = this.faqItems[swapIndex];
    this.websiteService.updateFaqItem(item.id, { sortOrder: swap.sortOrder }).subscribe({
      next: () => {
        this.websiteService.updateFaqItem(swap.id, { sortOrder: item.sortOrder }).subscribe({
          next: () => this.loadFaqItems(),
        });
      },
    });
  }

  askDeleteFaq(id: string): void {
    this.confirmDeleteFaqId = id;
    this.cdr.detectChanges();
  }

  cancelDeleteFaq(): void {
    this.confirmDeleteFaqId = null;
    this.cdr.detectChanges();
  }

  confirmDeleteFaq(id: string): void {
    this.deletingFaq = true;
    this.websiteService.removeFaqItem(id).subscribe({
      next: () => {
        this.deletingFaq = false;
        this.confirmDeleteFaqId = null;
        this.cdr.detectChanges();
        this.loadFaqItems();
      },
      error: () => {
        this.deletingFaq = false;
        this.cdr.detectChanges();
      },
    });
  }
}
