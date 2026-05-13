import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { DishService, Dish, DishGalleryImage } from '../../../core/services/dish.service';

@Component({
  selector: 'pdj-dish-detail',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './dish-detail.html',
  styleUrl: './dish-detail.scss',
})
export class DishDetail implements OnInit {
  dish: Dish | null = null;
  loading = true;
  error = '';

  // Carousel
  allImages: string[] = [];
  selectedImageIndex = 0;

  @ViewChild('thumbStrip') thumbStrip!: ElementRef<HTMLDivElement>;

  // Delete
  showDeleteDialog = false;
  deleting = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dishService: DishService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadDish(id);
    } else {
      this.error = 'No dish ID provided';
      this.loading = false;
    }
  }

  loadDish(id: string): void {
    this.loading = true;
    this.dishService.findOne(id)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res) => {
          this.dish = res.dish;
          this.buildImageList();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load dish:', err);
          this.error = err.error?.message || 'Failed to load dish';
          this.cdr.detectChanges();
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/app/dishes']);
  }

  navigateToEdit(): void {
    if (this.dish) {
      this.router.navigate(['/app/dishes', this.dish.id, 'edit']);
    }
  }

  // ── Carousel ───────────────────────────────────────────────────────────────

  private buildImageList(): void {
    this.allImages = [];
    if (this.dish?.image) {
      this.allImages.push(this.dish.image);
    }
    if (this.dish?.gallery?.length) {
      for (const img of this.dish.gallery) {
        if (img.path && !this.allImages.includes(img.path)) {
          this.allImages.push(img.path);
        }
      }
    }
    this.selectedImageIndex = 0;
  }

  get currentImage(): string | null {
    if (!this.allImages.length) return null;
    return this.allImages[this.selectedImageIndex];
  }

  selectImage(index: number): void {
    this.selectedImageIndex = index;
    this.cdr.detectChanges();
  }

  prevImage(): void {
    if (this.allImages.length <= 1) return;
    this.selectedImageIndex = this.selectedImageIndex === 0
      ? this.allImages.length - 1
      : this.selectedImageIndex - 1;
    this.scrollThumbIntoView();
    this.cdr.detectChanges();
  }

  nextImage(): void {
    if (this.allImages.length <= 1) return;
    this.selectedImageIndex = this.selectedImageIndex === this.allImages.length - 1
      ? 0
      : this.selectedImageIndex + 1;
    this.scrollThumbIntoView();
    this.cdr.detectChanges();
  }

  getThumbUrl(index: number): string {
    return this.allImages[index];
  }

  scrollThumbs(direction: 'left' | 'right'): void {
    if (!this.thumbStrip) return;
    const el = this.thumbStrip.nativeElement;
    const scrollAmount = 200;
    el.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
  }

  private scrollThumbIntoView(): void {
    setTimeout(() => {
      if (!this.thumbStrip) return;
      const el = this.thumbStrip.nativeElement;
      const thumb = el.children[this.selectedImageIndex] as HTMLElement;
      if (thumb) {
        thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(price);
  }

  getCategoryLabel(category: string | null): string {
    if (!category) return '';
    const map: Record<string, string> = {
      ENTREE: 'Entrée',
      PLAT_PRINCIPAL: 'Plat principal',
      DESSERT: 'Dessert',
      BOISSON: 'Boisson',
      ACCOMPAGNEMENT: 'Accompagnement',
    };
    return map[category] || category;
  }

  getCategoryColor(category: string | null): string {
    const map: Record<string, string> = {
      ENTREE: '#10B981',
      PLAT_PRINCIPAL: '#DC2626',
      DESSERT: '#F59E0B',
      BOISSON: '#3B82F6',
      ACCOMPAGNEMENT: '#8B5CF6',
    };
    return map[category || ''] || '#6B7280';
  }

  getDietLabel(diet: string | null): string {
    if (!diet) return '';
    const map: Record<string, string> = {
      VEGAN: 'Vegan',
      VEGETARIAN: 'Végétarien',
      GLUTEN_FREE: 'Sans gluten',
      HALAL: 'Halal',
    };
    return map[diet] || diet;
  }

  formatDate(date: string): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-CH', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  openDeleteDialog(): void {
    this.showDeleteDialog = true;
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog = false;
  }

  confirmDelete(): void {
    if (!this.dish) return;
    this.deleting = true;
    this.dishService.remove(this.dish.id)
      .pipe(finalize(() => {
        this.deleting = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.router.navigate(['/app/dishes']);
        },
        error: (err) => console.error('Failed to delete dish:', err),
      });
  }
}
