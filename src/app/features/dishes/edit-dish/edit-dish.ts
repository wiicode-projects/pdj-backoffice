import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { DishService, Dish } from '../../../core/services/dish.service';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

type DishCategory = 'ENTREE' | 'PLAT_PRINCIPAL' | 'DESSERT' | 'BOISSON' | 'ACCOMPAGNEMENT';
type DietOption = 'STANDARD' | 'VEGETARIAN' | 'VEGAN' | 'NO_GLUTEN';

interface CategoryOption {
  value: DishCategory;
  labelKey: string;
}

interface DietOptionItem {
  value: DietOption;
  labelKey: string;
}

@Component({
  selector: 'pdj-edit-dish',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './edit-dish.html',
  styleUrl: './edit-dish.scss',
})
export class EditDish implements OnInit {
  dishId = '';
  loadingDish = true;

  // Steps: 1 = form, 2 = image, 3 = preview
  currentStep = 1;
  readonly totalSteps = 3;

  // Form data
  name = '';
  description = '';
  price = '';
  selectedCategory: DishCategory = 'ENTREE';
  selectedDiet: DietOption = 'STANDARD';
  calories = '';
  preparationTime = '';
  isAvailable = true;

  // Image
  imageFile: File | null = null;
  imagePreview: string | null = null;
  existingImageUrl: string | null = null;
  imageChanged = false;
  galleryFiles: File[] = [];
  galleryPreviews: string[] = [];
  existingGalleryUrls: string[] = [];
  maxGalleryImages = 1;

  // Submission
  submitting = false;
  submitted = false;
  updatedDish: Dish | null = null;
  errorMessage = '';

  // Validation
  errors: Record<string, string> = {};

  readonly categories: CategoryOption[] = [
    { value: 'ENTREE', labelKey: 'DISHES.CATEGORIES.ENTREE' },
    { value: 'PLAT_PRINCIPAL', labelKey: 'DISHES.CATEGORIES.PLAT_PRINCIPAL' },
    { value: 'DESSERT', labelKey: 'DISHES.CATEGORIES.DESSERT' },
    { value: 'BOISSON', labelKey: 'DISHES.CATEGORIES.BOISSON' },
    { value: 'ACCOMPAGNEMENT', labelKey: 'DISHES.CATEGORIES.ACCOMPAGNEMENT' },
  ];

  readonly diets: DietOptionItem[] = [
    { value: 'STANDARD', labelKey: 'DISHES.DIETS.STANDARD' },
    { value: 'VEGETARIAN', labelKey: 'DISHES.DIETS.VEGETARIAN' },
    { value: 'VEGAN', labelKey: 'DISHES.DIETS.VEGAN' },
    { value: 'NO_GLUTEN', labelKey: 'DISHES.DIETS.GLUTEN_FREE' },
  ];

  constructor(
    private dishService: DishService,
    private authService: AuthService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.dishId = this.route.snapshot.paramMap.get('id') || '';
    if (this.dishId) {
      this.loadDish();
      this.loadSubscriptionLimits();
    } else {
      this.router.navigate(['/app/dishes']);
    }
  }

  get restaurantId(): string {
    return this.authService.user()?.restaurant?.id || '';
  }

  private loadSubscriptionLimits(): void {
    const id = this.restaurantId;
    if (!id) return;
    this.http.get<any>(`${environment.apiUrl}/restaurants/${id}`)
      .subscribe({
        next: (res) => {
          const maxImages = res?.restaurant?.membership?.subscription?.maxImagesPerDish;
          if (maxImages && maxImages > 1) {
            this.maxGalleryImages = maxImages - 1;
          } else if (maxImages === 1) {
            this.maxGalleryImages = 0;
          }
          this.cdr.detectChanges();
        },
        error: () => { /* keep default */ },
      });
  }

  get descriptionLength(): number {
    return this.description.length;
  }

  // ── Load existing dish ─────────────────────────────────────────────────

  loadDish(): void {
    this.loadingDish = true;
    this.dishService.findOne(this.dishId)
      .pipe(finalize(() => {
        this.loadingDish = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res) => {
          const dish = res.dish;
          this.name = dish.name || '';
          this.description = dish.description || '';
          this.price = String(dish.price || 0);
          this.selectedCategory = (dish.category as DishCategory) || 'ENTREE';
          this.selectedDiet = (dish.diet as DietOption) || 'STANDARD';
          this.calories = dish.calories ? String(dish.calories) : '';
          this.preparationTime = dish.preparationTime ? String(dish.preparationTime) : '';
          this.isAvailable = dish.isAvailable;

          if (dish.image) {
            this.existingImageUrl = dish.image;
            this.imagePreview = this.existingImageUrl;
          }

          if (dish.gallery && dish.gallery.length > 0) {
            this.existingGalleryUrls = dish.gallery.map(g => g.path);
            this.galleryPreviews = [...this.existingGalleryUrls];
          }

          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load dish:', err);
          this.router.navigate(['/app/dishes']);
        },
      });
  }

  // ── Step navigation ─────────────────────────────────────────────────────

  goToStep(step: number): void {
    if (step === 2 && !this.validateStep1()) return;
    if (step === 3 && !this.validateStep2()) return;
    this.currentStep = step;
  }

  nextStep(): void {
    this.goToStep(this.currentStep + 1);
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    } else {
      this.router.navigate(['/app/dishes']);
    }
  }

  cancel(): void {
    this.router.navigate(['/app/dishes']);
  }

  // ── Validation ──────────────────────────────────────────────────────────

  validateStep1(): boolean {
    this.errors = {};
    if (!this.name.trim()) this.errors['name'] = 'DISHES.CREATE_FORM.ERROR_NAME';
    if (!this.description.trim()) this.errors['description'] = 'DISHES.CREATE_FORM.ERROR_DESCRIPTION';
    if (!this.price || isNaN(Number(this.price)) || Number(this.price) <= 0)
      this.errors['price'] = 'DISHES.CREATE_FORM.ERROR_PRICE';
    return Object.keys(this.errors).length === 0;
  }

  validateStep2(): boolean {
    this.errors = {};
    // For edit: image is optional if there's already an existing one
    if (!this.imageFile && !this.existingImageUrl) {
      this.errors['image'] = 'DISHES.CREATE_FORM.ERROR_IMAGE';
    }
    return Object.keys(this.errors).length === 0;
  }

  // ── Image handling ──────────────────────────────────────────────────────

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.imageFile = input.files[0];
      this.imageChanged = true;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
        this.errors['image'] = '';
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(this.imageFile);
    }
  }

  removeImage(): void {
    this.imageFile = null;
    this.imagePreview = null;
    this.existingImageUrl = null;
    this.imageChanged = true;
  }

  onGallerySelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const remainingSlots = this.maxGalleryImages - this.galleryFiles.length - this.existingGalleryUrls.length;
      const newFiles = Array.from(input.files).slice(0, remainingSlots);
      for (const file of newFiles) {
        this.galleryFiles.push(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          this.galleryPreviews.push(e.target?.result as string);
          this.cdr.detectChanges();
        };
        reader.readAsDataURL(file);
      }
    }
  }

  removeGalleryImage(index: number): void {
    if (index < this.existingGalleryUrls.length) {
      this.existingGalleryUrls.splice(index, 1);
      this.galleryPreviews.splice(index, 1);
    } else {
      const fileIndex = index - this.existingGalleryUrls.length;
      this.galleryFiles.splice(fileIndex, 1);
      this.galleryPreviews.splice(index, 1);
    }
  }

  // ── Submission ──────────────────────────────────────────────────────────

  submit(): void {
    if (!this.restaurantId) return;
    // Must have either an existing image or a new image
    if (!this.imageFile && !this.existingImageUrl) return;

    this.submitting = true;
    this.errorMessage = '';
    const fd = new FormData();
    fd.append('name', this.name.trim());
    fd.append('description', this.description.trim());
    fd.append('price', this.price);
    fd.append('category', this.selectedCategory);
    fd.append('diet', this.selectedDiet);
    fd.append('restaurantId', this.restaurantId);
    if (this.calories) fd.append('calories', this.calories);
    if (this.preparationTime) fd.append('preparationTime', this.preparationTime);
    fd.append('isAvailable', String(this.isAvailable));

    // Only send new image if changed
    if (this.imageFile) {
      fd.append('image', this.imageFile, this.imageFile.name);
    }
    for (const file of this.galleryFiles) {
      fd.append('gallery', file, file.name);
    }

    this.dishService.update(this.dishId, fd)
      .pipe(finalize(() => {
        this.submitting = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res) => {
          this.updatedDish = res.dish;
          this.submitted = true;
          this.cdr.detectChanges();
          // Auto-navigate back so the list refreshes with updated data
          setTimeout(() => this.goToDishes(), 1500);
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'An error occurred';
          console.error('Update dish error:', err);
        },
      });
  }

  goToDishes(): void {
    this.router.navigate(['/app/dishes']);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  getImageUrl(path: string | null): string {
    return path || '';
  }

  formatPrice(val: string): string {
    const num = Number(val);
    if (isNaN(num)) return '0.00 CHF';
    return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(num);
  }

  getCategoryLabel(cat: string): string {
    const found = this.categories.find(c => c.value === cat);
    return found?.labelKey || cat;
  }

  getDietLabel(diet: string): string {
    const found = this.diets.find(d => d.value === diet);
    return found?.labelKey || diet;
  }

  getCategoryColor(cat: string): string {
    const map: Record<string, string> = {
      ENTREE: '#10B981', PLAT_PRINCIPAL: '#DC2626', DESSERT: '#F59E0B',
      BOISSON: '#3B82F6', ACCOMPAGNEMENT: '#8B5CF6',
    };
    return map[cat] || '#6B7280';
  }
}
