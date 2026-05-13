import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { RestaurantService } from '../../../core/services/restaurant.service';
import { environment } from '../../../../environments/environment';

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
  images: { id: string; path: string }[] | null;
  branches: Restaurant[];
  membership: {
    id: string;
    isActive: boolean;
    endingAt: string | null;
    subscription: { id: string; name: string } | null;
  } | null;
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
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private restaurantService: RestaurantService,
    private cdr: ChangeDetectorRef,
  ) {}

  get restaurantId(): string | null {
    return this.authService.user()?.restaurant?.id || null;
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
        this.populateForm();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load restaurant:', err);
        this.error = 'Impossible de charger le restaurant.';
        this.cdr.detectChanges();
      },
    });
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
    this.formShortDescription = (this.restaurant as any).shortDescription || '';
    this.formGoogleMapsUrl = (this.restaurant as any).googleMapsUrl || '';
  }

  goBack(): void {
    this.router.navigate(['/app/my-restaurants']);
  }

  saveChanges(): void {
    if (!this.restaurant) return;
    if (!this.formName.trim()) {
      this.error = 'Le nom du restaurant est requis.';
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
    formData.append('openingTime', this.formOpeningTime.trim());
    formData.append('closingTime', this.formClosingTime.trim());
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

    this.restaurantService.update(this.restaurant.id, formData)
      .pipe(finalize(() => {
        this.saving = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res) => {
          this.restaurant = res.restaurant as any;
          this.populateForm();
          this.successMessage = 'Restaurant mis à jour avec succès.';
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
