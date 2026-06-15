import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { finalize, switchMap } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { RestaurantService } from '../../../core/services/restaurant.service';
import { environment } from '../../../../environments/environment';

interface RestaurantImage {
  id: string;
  path: string;
}

interface Restaurant {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  phone: string | null;
  type: 'FIXED' | 'FIXE' | 'ITINERANT';
  imagePath: string | null;
  parentId: string | null;
  viewCount: number;
  clickCount: number;
  reservationEnabled: boolean;
  bookingMethod: string | null;
  bookingContact: string | null;
  openingTime: string | null;
  closingTime: string | null;
  shortDescription: string | null;
  googleMapsUrl: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  images: RestaurantImage[] | null;
  branches: Restaurant[];
  membership: {
    id: string;
    isActive: boolean;
    endingAt: string | null;
    subscription: {
      id: string;
      name: string;
      maxProfilePhotos?: number | null;
      maxRestaurants?: number | null;
      isAllowedToBeItinerant?: boolean;
      isMultiRestaurant?: boolean;
    } | null;
  } | null;
}

interface ActiveSubscription {
  maxProfilePhotos?: number | null;
  maxRestaurants?: number | null;
  isAllowedToBeItinerant?: boolean;
  isMultiRestaurant?: boolean;
}

@Component({
  selector: 'pdj-manage-restaurant',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './manage-restaurant.html',
  styleUrl: './manage-restaurant.scss',
})
export class ManageRestaurant implements OnInit {
  restaurant: Restaurant | null = null;
  loading = true;
  saving = false;
  error = '';
  successMessage = '';

  maxProfilePhotos: number | null = null;
  canBeItinerant = false;

  coverImageFile: File | null = null;
  coverImagePreview: string | null = null;
  pendingGalleryFiles: File[] = [];
  pendingGalleryPreviews: string[] = [];
  deletingImageId: string | null = null;

  showDeleteDialog = false;
  deleting = false;

  // Form
  formName = '';
  formType: 'FIXE' | 'ITINERANT' = 'FIXE';
  formAddress = '';
  formCity = '';
  formPostalCode = '';
  formCountry = '';
  formPhone = '';
  formOpeningTime = '';
  formClosingTime = '';
  formReservationEnabled = false;
  formBookingMethod = '';
  formBookingContact = '';
  formShortDescription = '';
  formGoogleMapsUrl = '';

  constructor(
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private restaurantService: RestaurantService,
    private cdr: ChangeDetectorRef,
  ) {}

  get restaurantId(): string | null {
    return this.authService.user()?.restaurant?.id || null;
  }

  get existingPhotos(): RestaurantImage[] {
    return this.restaurant?.images ?? [];
  }

  get totalPhotoCount(): number {
    return this.existingPhotos.length + this.pendingGalleryFiles.length;
  }

  get canAddPhoto(): boolean {
    if (this.maxProfilePhotos === 0) return false;
    if (this.maxProfilePhotos === null) return true;
    return this.totalPhotoCount < this.maxProfilePhotos;
  }

  get galleryLocked(): boolean {
    return this.maxProfilePhotos === 0;
  }

  get coverDisplayUrl(): string | null {
    if (this.coverImagePreview) return this.coverImagePreview;
    if (this.restaurant?.imagePath) return this.getImageUrl(this.restaurant.imagePath);
    const first = this.existingPhotos[0];
    return first ? this.getImageUrl(first.path) : null;
  }

  get isBranch(): boolean {
    return !!this.restaurant?.parentId;
  }

  get itinerantLocked(): boolean {
    return !this.canBeItinerant;
  }

  get isItinerant(): boolean {
    return this.formType === 'ITINERANT';
  }

  ngOnInit(): void {
    const id = this.restaurantId;
    if (id) {
      this.loadRestaurant(id);
    } else {
      this.error = 'Aucun restaurant lié à votre compte.';
      this.loading = false;
    }
  }

  loadRestaurant(id: string): void {
    this.loading = true;
    this.http.get<{ status: number; restaurant: Restaurant }>(
      `${environment.apiUrl}/restaurants/${id}`
    )
    .pipe(finalize(() => {
      this.loading = false;
      this.cdr.detectChanges();
    }))
    .subscribe({
      next: (res) => {
        this.restaurant = res.restaurant;
        this.applySubscription(res.restaurant.membership?.subscription ?? null);
        this.populateForm();
        this.loadActiveSubscription(id);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load restaurant:', err);
        this.error = 'Impossible de charger le restaurant.';
        this.cdr.detectChanges();
      },
    });
  }

  private loadActiveSubscription(restaurantId: string): void {
    this.http.get<{ status: number; membership: { subscription: ActiveSubscription | null } }>(
      `${environment.apiUrl}/restaurants/${restaurantId}/subscriptions/active`
    ).subscribe({
      next: (res) => {
        this.applySubscription(res.membership?.subscription ?? null);
        this.cdr.detectChanges();
      },
      error: () => {
        // Keep defaults from restaurant.membership
      },
    });
  }

  private applySubscription(subscription: ActiveSubscription | null): void {
    this.maxProfilePhotos = subscription?.maxProfilePhotos ?? null;
    this.canBeItinerant = subscription?.isAllowedToBeItinerant === true;
    if (!this.canBeItinerant && this.formType === 'ITINERANT') {
      this.formType = 'FIXE';
    }
  }

  selectFormType(type: 'FIXE' | 'ITINERANT'): void {
    if (type === 'ITINERANT' && this.itinerantLocked) return;
    this.formType = type;
    this.cdr.detectChanges();
  }

  populateForm(): void {
    if (!this.restaurant) return;
    this.formName = this.restaurant.name || '';
    this.formType = (this.restaurant.type === 'FIXED' ? 'FIXE' : this.restaurant.type) as 'FIXE' | 'ITINERANT';
    this.formAddress = this.restaurant.address || '';
    this.formCity = this.restaurant.city || '';
    this.formPostalCode = this.restaurant.postalCode || '';
    this.formCountry = this.restaurant.country || '';
    this.formPhone = this.restaurant.phone || '';
    this.formOpeningTime = this.restaurant.openingTime || '';
    this.formClosingTime = this.restaurant.closingTime || '';
    this.formReservationEnabled = this.restaurant.reservationEnabled || false;
    this.formBookingMethod = this.restaurant.bookingMethod || '';
    this.formBookingContact = this.restaurant.bookingContact || '';
    this.formShortDescription = this.restaurant.shortDescription || '';
    this.formGoogleMapsUrl = this.restaurant.googleMapsUrl || '';
  }

  goBack(): void {
    this.router.navigate(['/app/my-restaurants']);
  }

  goToMembership(): void {
    this.router.navigate(['/app/membership']);
  }

  toggleReservation(): void {
    this.formReservationEnabled = !this.formReservationEnabled;
    if (!this.formReservationEnabled) {
      this.formBookingMethod = '';
      this.formBookingContact = '';
    }
    this.cdr.detectChanges();
  }

  onCoverSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.coverImageFile = file;
    this.coverImagePreview = URL.createObjectURL(file);
    input.value = '';
    this.cdr.detectChanges();
  }

  removeCoverSelection(): void {
    if (this.coverImagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(this.coverImagePreview);
    }
    this.coverImageFile = null;
    this.coverImagePreview = null;
    this.cdr.detectChanges();
  }

  onGallerySelected(event: Event): void {
    if (!this.canAddPhoto) return;

    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;

    const slotsLeft = this.maxProfilePhotos === null
      ? files.length
      : Math.max(0, this.maxProfilePhotos - this.totalPhotoCount);

    const toAdd = files.slice(0, slotsLeft);
    for (const file of toAdd) {
      this.pendingGalleryFiles.push(file);
      this.pendingGalleryPreviews.push(URL.createObjectURL(file));
    }

    input.value = '';
    this.cdr.detectChanges();
  }

  removePendingGallery(index: number): void {
    const preview = this.pendingGalleryPreviews[index];
    if (preview?.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    this.pendingGalleryFiles.splice(index, 1);
    this.pendingGalleryPreviews.splice(index, 1);
    this.cdr.detectChanges();
  }

  deleteGalleryPhoto(imageId: string): void {
    if (!this.restaurant || this.deletingImageId) return;

    this.deletingImageId = imageId;
    this.error = '';

    this.restaurantService.deleteImage(this.restaurant.id, imageId)
      .pipe(finalize(() => {
        this.deletingImageId = null;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          if (this.restaurant) {
            this.restaurant = {
              ...this.restaurant,
              images: (this.restaurant.images ?? []).filter(img => img.id !== imageId),
            };
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to delete gallery photo:', err);
          this.error = err.error?.message || 'MANAGE_RESTAURANT.GALLERY_DELETE_ERROR';
          this.cdr.detectChanges();
        },
      });
  }

  saveChanges(): void {
    if (!this.restaurant) return;
    if (!this.formName.trim()) {
      this.error = 'MANAGE_RESTAURANT.NAME_REQUIRED';
      return;
    }
    if (this.formType === 'ITINERANT' && this.itinerantLocked) {
      this.error = 'MANAGE_RESTAURANT.ITINERANT_LOCKED';
      return;
    }

    this.saving = true;
    this.error = '';
    this.successMessage = '';

    const formData = new FormData();
    formData.append('name', this.formName.trim());
    formData.append('type', this.formType);
    formData.append('address', this.formAddress.trim());
    formData.append('city', this.formCity.trim());
    formData.append('postalCode', this.formPostalCode.trim());
    formData.append('country', this.formCountry.trim());
    formData.append('phone', this.formPhone.trim());
    formData.append('reservationEnabled', String(this.formReservationEnabled));
    if (this.formBookingMethod) {
      formData.append('bookingMethod', this.formBookingMethod);
    }
    if (this.formBookingContact) {
      formData.append('bookingContact', this.formBookingContact.trim());
    }
    if (this.formShortDescription) {
      formData.append('shortDescription', this.formShortDescription.trim());
    }
    if (this.formGoogleMapsUrl) {
      formData.append('googleMapsUrl', this.formGoogleMapsUrl.trim());
    }
    if (this.coverImageFile) {
      formData.append('image', this.coverImageFile, this.coverImageFile.name);
    }
    for (const file of this.pendingGalleryFiles) {
      formData.append('gallery', file, file.name);
    }

    this.restaurantService.update(this.restaurant.id, formData)
      .pipe(
        switchMap(() => {
          const id = this.restaurant!.id;
          return this.http.get<{ status: number; restaurant: Restaurant }>(
            `${environment.apiUrl}/restaurants/${id}`,
          ).pipe(
            switchMap((fresh) => {
              this.restaurant = fresh.restaurant;
              return this.authService.fetchAndStoreUserInfo();
            }),
          );
        }),
        finalize(() => {
          this.saving = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.resetPendingMedia();
          this.populateForm();
          this.successMessage = 'MANAGE_RESTAURANT.SAVE_SUCCESS';
          setTimeout(() => {
            this.successMessage = '';
            this.cdr.detectChanges();
          }, 3000);
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to update restaurant:', err);
          this.error = err.error?.message || 'Erreur lors de la mise à jour.';
          this.cdr.detectChanges();
        },
      });
  }

  private resetPendingMedia(): void {
    if (this.coverImagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(this.coverImagePreview);
    }
    for (const preview of this.pendingGalleryPreviews) {
      if (preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    }
    this.coverImageFile = null;
    this.coverImagePreview = null;
    this.pendingGalleryFiles = [];
    this.pendingGalleryPreviews = [];
  }

  openDeleteDialog(): void {
    this.showDeleteDialog = true;
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog = false;
  }

  confirmDelete(): void {
    if (!this.restaurant) return;

    this.deleting = true;
    this.error = '';

    this.restaurantService.remove(this.restaurant.id)
      .pipe(
        switchMap(() => this.authService.fetchAndStoreUserInfo()),
        finalize(() => {
          this.deleting = false;
          this.showDeleteDialog = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/app/my-restaurants']);
        },
        error: (err) => {
          console.error('Failed to delete restaurant:', err);
          this.error = err.error?.message || 'MANAGE_RESTAURANT.DELETE_ERROR';
          this.cdr.detectChanges();
        },
      });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  getImageUrl(path: string | null): string {
    return path || '';
  }

  getTypeLabel(type: string): string {
    return type === 'ITINERANT' ? 'Itinérant' : 'Fixe';
  }

  getFullAddress(): string {
    if (!this.restaurant) return '—';
    const parts = [this.restaurant.address, this.restaurant.postalCode, this.restaurant.city, this.restaurant.country].filter(Boolean);
    return parts.join(', ') || '—';
  }

  formatDate(date: string | null): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-CH', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }
}
