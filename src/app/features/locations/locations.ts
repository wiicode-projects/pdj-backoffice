import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { LocationService, LocationSlot, WeeklyPlanSlot } from '../../core/services/location.service';
import { environment } from '../../../environments/environment';

// ── Day helpers ─────────────────────────────────────────────────────────
const DAYS = [
  { index: 1, key: 'MON', label: 'Lundi' },
  { index: 2, key: 'TUE', label: 'Mardi' },
  { index: 3, key: 'WED', label: 'Mercredi' },
  { index: 4, key: 'THU', label: 'Jeudi' },
  { index: 5, key: 'FRI', label: 'Vendredi' },
  { index: 6, key: 'SAT', label: 'Samedi' },
  { index: 7, key: 'SUN', label: 'Dimanche' },
];

interface DaySlot {
  address: string;
  startTime: string;
  endTime: string;
}

interface DayPlan {
  dayIndex: number;
  dayKey: string;
  dayLabel: string;
  slots: DaySlot[];
  collapsed: boolean;
}

interface RestaurantInfo {
  id: string;
  name: string;
  type: string;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  googleMapsUrl: string | null;
  phone: string | null;
  openingTime: string | null;
  closingTime: string | null;
  locations: {
    id: string;
    address: string;
    longitude: number | null;
    latitude: number | null;
    dayOfWeek: number | null;
    startTime: string | null;
    endTime: string | null;
  }[] | null;
}

@Component({
  selector: 'pdj-locations',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './locations.html',
  styleUrl: './locations.scss',
})
export class Locations implements OnInit {
  loading = true;
  saving = false;
  saveSuccess = false;
  restaurant: RestaurantInfo | null = null;

  // ── FIXE fields ─────────────────────────────────────────────────────
  fixeAddress = '';
  fixeCity = '';
  fixePostalCode = '';
  fixeCountry = '';
  fixeGoogleMapsUrl = '';
  fixePhone = '';
  fixeOpeningTime = '';
  fixeClosingTime = '';
  fixeLatitude: number | null = null;
  fixeLongitude: number | null = null;
  fixeLocationId: string | null = null;

  // ── ITINERANT fields ────────────────────────────────────────────────
  weeklyPlan: DayPlan[] = [];
  savingPlan = false;
  planSaveSuccess = false;
  planError = '';

  // ── Slot modal ──────────────────────────────────────────────────────
  slotModalOpen = false;
  slotModalDayIndex = -1;
  slotModalEditIndex = -1; // -1 = add, >= 0 = edit
  slotAddress = '';
  slotStartTime = '11:30';
  slotEndTime = '14:30';
  slotError = '';

  // ── Time picker ─────────────────────────────────────────────────────
  timePickerOpen = false;
  timePickerTarget: 'start' | 'end' = 'start';
  timePickerHour = 11;
  timePickerMinute = 30;
  readonly hours = Array.from({ length: 24 }, (_, i) => i);
  readonly minutes = [0, 15, 30, 45];

  constructor(
    private authService: AuthService,
    private locationService: LocationService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadRestaurant();
  }

  get restaurantId(): string {
    return this.authService.user()?.restaurant?.id || '';
  }

  get isFixe(): boolean {
    return this.restaurant?.type === 'FIXE';
  }

  get isItinerant(): boolean {
    return this.restaurant?.type === 'ITINERANT';
  }

  get typeLabel(): string {
    if (this.restaurant?.type === 'FIXE') return 'LOCATIONS.TYPE_FIXE';
    if (this.restaurant?.type === 'ITINERANT') return 'LOCATIONS.TYPE_ITINERANT';
    return 'LOCATIONS.TYPE_MULTI';
  }

  get totalSlots(): number {
    return this.weeklyPlan.reduce((sum, d) => sum + d.slots.length, 0);
  }

  get activeDays(): number {
    return this.weeklyPlan.filter(d => d.slots.length > 0).length;
  }

  // ── Data loading ──────────────────────────────────────────────────────
  loadRestaurant(): void {
    const id = this.restaurantId;
    if (!id) {
      this.loading = false;
      return;
    }
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/restaurants/${id}`)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res) => {
          this.restaurant = res.restaurant;
          if (this.isFixe) {
            this.initFixeFields();
          } else if (this.isItinerant) {
            this.loadWeeklyPlan();
          }
        },
        error: (err) => console.error('Failed to load restaurant:', err),
      });
  }

  private initFixeFields(): void {
    if (!this.restaurant) return;
    this.fixeAddress = this.restaurant.address || '';
    this.fixeCity = this.restaurant.city || '';
    this.fixePostalCode = this.restaurant.postalCode || '';
    this.fixeCountry = this.restaurant.country || '';
    this.fixeGoogleMapsUrl = this.restaurant.googleMapsUrl || '';
    this.fixePhone = this.restaurant.phone || '';
    this.fixeOpeningTime = this.restaurant.openingTime || '';
    this.fixeClosingTime = this.restaurant.closingTime || '';

    // Get coordinates from the first location
    const loc = this.restaurant.locations?.[0];
    if (loc) {
      this.fixeLatitude = loc.latitude;
      this.fixeLongitude = loc.longitude;
      this.fixeLocationId = loc.id;
    }
  }

  private loadWeeklyPlan(): void {
    const id = this.restaurantId;
    if (!id) return;
    this.locationService.findByRestaurant(id).subscribe({
      next: (res) => {
        this.buildWeeklyPlan(res.locations);
        this.cdr.detectChanges();
      },
      error: () => {
        this.buildWeeklyPlan([]);
        this.cdr.detectChanges();
      },
    });
  }

  private buildWeeklyPlan(locations: LocationSlot[]): void {
    this.weeklyPlan = DAYS.map(d => {
      const slots = locations
        .filter(l => l.dayOfWeek === d.index && l.startTime && l.endTime)
        .map(l => ({
          address: l.address,
          startTime: l.startTime!,
          endTime: l.endTime!,
        }));
      return {
        dayIndex: d.index,
        dayKey: d.key,
        dayLabel: d.label,
        slots,
        collapsed: slots.length === 0,
      };
    });
  }

  // ── FIXE: Save ────────────────────────────────────────────────────────
  saveFixe(): void {
    if (!this.restaurant) return;
    this.saving = true;
    this.saveSuccess = false;

    const body: any = {
      address: this.fixeAddress,
      city: this.fixeCity,
      postalCode: this.fixePostalCode,
      country: this.fixeCountry,
      googleMapsUrl: this.fixeGoogleMapsUrl || null,
      phone: this.fixePhone || null,
      openingTime: this.fixeOpeningTime || null,
      closingTime: this.fixeClosingTime || null,
    };

    this.http.patch<any>(`${environment.apiUrl}/restaurants/${this.restaurant.id}`, body)
      .pipe(finalize(() => {
        this.saving = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          // Also update location coordinates if we have them
          if (this.fixeLocationId && (this.fixeLatitude !== null || this.fixeLongitude !== null)) {
            this.locationService.update(this.fixeLocationId, {
              address: this.fixeAddress,
              latitude: this.fixeLatitude,
              longitude: this.fixeLongitude,
            } as any).subscribe();
          }
          this.saveSuccess = true;
          setTimeout(() => {
            this.saveSuccess = false;
            this.cdr.detectChanges();
          }, 3000);
        },
        error: (err) => console.error('Failed to save:', err),
      });
  }

  // ── ITINERANT: Slot modal ─────────────────────────────────────────────
  openAddSlot(dayIndex: number): void {
    const day = this.weeklyPlan.find(d => d.dayIndex === dayIndex);
    if (day) day.collapsed = false;
    this.slotModalDayIndex = dayIndex;
    this.slotModalEditIndex = -1;
    this.slotAddress = '';
    this.slotStartTime = '11:30';
    this.slotEndTime = '14:30';
    this.slotError = '';
    this.slotModalOpen = true;
  }

  openEditSlot(dayIndex: number, slotIndex: number): void {
    const day = this.weeklyPlan.find(d => d.dayIndex === dayIndex);
    if (!day) return;
    const slot = day.slots[slotIndex];
    if (!slot) return;
    this.slotModalDayIndex = dayIndex;
    this.slotModalEditIndex = slotIndex;
    this.slotAddress = slot.address;
    this.slotStartTime = slot.startTime;
    this.slotEndTime = slot.endTime;
    this.slotError = '';
    this.slotModalOpen = true;
  }

  deleteSlot(dayIndex: number, slotIndex: number): void {
    const day = this.weeklyPlan.find(d => d.dayIndex === dayIndex);
    if (!day) return;
    day.slots.splice(slotIndex, 1);
    this.cdr.detectChanges();
  }

  closeSlotModal(): void {
    this.slotModalOpen = false;
    this.slotError = '';
  }

  saveSlot(): void {
    if (!this.slotAddress.trim()) {
      this.slotError = 'LOCATIONS.ERROR_ADDRESS_REQUIRED';
      return;
    }

    const startMin = this.timeToMinutes(this.slotStartTime);
    const endMin = this.timeToMinutes(this.slotEndTime);
    if (endMin <= startMin) {
      this.slotError = 'LOCATIONS.ERROR_END_BEFORE_START';
      return;
    }

    // Check overlap
    const day = this.weeklyPlan.find(d => d.dayIndex === this.slotModalDayIndex);
    if (!day) return;

    const otherSlots = day.slots.filter((_, i) => i !== this.slotModalEditIndex);
    for (const other of otherSlots) {
      const os = this.timeToMinutes(other.startTime);
      const oe = this.timeToMinutes(other.endTime);
      if (startMin < oe && os < endMin) {
        this.slotError = 'LOCATIONS.ERROR_OVERLAP';
        return;
      }
    }

    const newSlot: DaySlot = {
      address: this.slotAddress.trim(),
      startTime: this.slotStartTime,
      endTime: this.slotEndTime,
    };

    if (this.slotModalEditIndex >= 0) {
      day.slots[this.slotModalEditIndex] = newSlot;
    } else {
      day.slots.push(newSlot);
    }

    // Sort slots by start time
    day.slots.sort((a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime));
    day.collapsed = false;
    this.slotModalOpen = false;
    this.cdr.detectChanges();
  }

  get slotModalDayLabel(): string {
    const day = this.weeklyPlan.find(d => d.dayIndex === this.slotModalDayIndex);
    return day ? day.dayLabel : '';
  }

  get isEditingSlot(): boolean {
    return this.slotModalEditIndex >= 0;
  }

  // ── Time picker ─────────────────────────────────────────────────────
  openTimePicker(target: 'start' | 'end'): void {
    this.timePickerTarget = target;
    const time = target === 'start' ? this.slotStartTime : this.slotEndTime;
    const [h, m] = time.split(':').map(Number);
    this.timePickerHour = isNaN(h) ? 9 : h;
    this.timePickerMinute = this.snapMinute(isNaN(m) ? 0 : m);
    this.timePickerOpen = true;
  }

  closeTimePicker(): void {
    this.timePickerOpen = false;
  }

  selectHour(h: number): void {
    this.timePickerHour = h;
  }

  selectMinute(m: number): void {
    this.timePickerMinute = m;
  }

  confirmTimePicker(): void {
    const time = this.padNum(this.timePickerHour) + ':' + this.padNum(this.timePickerMinute);
    if (this.timePickerTarget === 'start') {
      this.slotStartTime = time;
    } else {
      this.slotEndTime = time;
    }
    this.timePickerOpen = false;
    this.slotError = '';
  }

  get timePickerPreview(): string {
    return this.padNum(this.timePickerHour) + ':' + this.padNum(this.timePickerMinute);
  }

  // ── ITINERANT: Save plan ──────────────────────────────────────────────
  saveWeeklyPlan(): void {
    const id = this.restaurantId;
    if (!id) return;

    this.savingPlan = true;
    this.planSaveSuccess = false;
    this.planError = '';

    const slots: WeeklyPlanSlot[] = [];
    for (const day of this.weeklyPlan) {
      for (const slot of day.slots) {
        slots.push({
          address: slot.address,
          dayOfWeek: day.dayIndex,
          startTime: slot.startTime,
          endTime: slot.endTime,
        });
      }
    }

    this.locationService.replaceWeeklyPlan(id, slots)
      .pipe(finalize(() => {
        this.savingPlan = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res) => {
          this.buildWeeklyPlan(res.locations);
          this.planSaveSuccess = true;
          setTimeout(() => {
            this.planSaveSuccess = false;
            this.cdr.detectChanges();
          }, 3000);
        },
        error: (err) => {
          this.planError = err?.error?.message || 'An error occurred';
          console.error('Save plan error:', err);
        },
      });
  }

  resetWeeklyPlan(): void {
    this.weeklyPlan.forEach(d => {
      d.slots = [];
      d.collapsed = true;
    });
    this.cdr.detectChanges();
  }

  toggleDay(dayIndex: number): void {
    const day = this.weeklyPlan.find(d => d.dayIndex === dayIndex);
    if (day) day.collapsed = !day.collapsed;
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  padNum(n: number): string {
    return String(n).padStart(2, '0');
  }

  timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  snapMinute(m: number): number {
    return this.minutes.reduce((prev, cur) =>
      Math.abs(cur - m) < Math.abs(prev - m) ? cur : prev
    );
  }

  openInMaps(): void {
    const query = encodeURIComponent(
      this.fixeGoogleMapsUrl || `${this.fixeAddress}, ${this.fixeCity}`
    );
    window.open(`https://maps.google.com/?q=${query}`, '_blank');
  }
}
