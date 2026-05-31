import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  selector: 'pdj-create-dish',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './create-dish.html',
  styleUrl: './create-dish.scss',
})
export class CreateDish implements OnInit {
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
  galleryFiles: File[] = [];
  galleryPreviews: string[] = [];
  maxGalleryImages = 1; // will be updated from subscription

  // Submission
  submitting = false;
  submitted = false;
  createdDish: Dish | null = null;
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
  ) {}

  ngOnInit(): void {
    this.loadSubscriptionLimits();
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
            // Main image counts as 1, remaining slots are for gallery
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
    if (!this.imageFile) this.errors['image'] = 'DISHES.CREATE_FORM.ERROR_IMAGE';
    return Object.keys(this.errors).length === 0;
  }

  // ── Image handling ──────────────────────────────────────────────────────

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.imageFile = input.files[0];
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
  }

  onGallerySelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const remainingSlots = this.maxGalleryImages - this.galleryFiles.length;
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
    this.galleryFiles.splice(index, 1);
    this.galleryPreviews.splice(index, 1);
  }

  // ── Submission ──────────────────────────────────────────────────────────

  submit(): void {
    if (!this.imageFile || !this.restaurantId) return;

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
    fd.append('image', this.imageFile, this.imageFile.name);
    for (const file of this.galleryFiles) {
      fd.append('gallery', file, file.name);
    }

    this.dishService.create(fd)
      .pipe(finalize(() => {
        this.submitting = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res) => {
          this.createdDish = res.dish;
          this.submitted = true;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'An error occurred';
          console.error('Create dish error:', err);
        },
      });
  }

  goToDishes(): void {
    this.router.navigate(['/app/dishes']);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

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
