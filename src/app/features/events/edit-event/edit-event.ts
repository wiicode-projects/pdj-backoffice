import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  EventService,
  PlatformEvent,
  EventCategory,
  EventStatus,
  EventRewardType,
  UpdateEventPayload,
} from '../../../core/services/event.service';
import { RestaurantService, AdminRestaurant } from '../../../core/services/restaurant.service';

interface RewardFormItem {
  name: string;
  description: string;
  type: EventRewardType;
  quantity: number;
}

@Component({
  selector: 'pdj-edit-event',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-event.html',
  styleUrl: './edit-event.scss',
})
export class EditEvent implements OnInit {
  eventId = '';
  loading = true;
  saving = false;
  saved = false;

  // Form
  title = '';
  description = '';
  category: EventCategory = 'PROMOTION';
  status: EventStatus = 'UPCOMING';
  location = '';
  startDate = '';
  endDate = '';
  maxAttendees = 0;
  isFeatured = false;
  imageColor = '';
  restaurantId = '';
  rewards: RewardFormItem[] = [];

  // Cover image
  coverFile: File | null = null;
  coverPreview: string | null = null;
  existingCoverUrl: string | null = null;

  restaurants: AdminRestaurant[] = [];
  errors: Record<string, string> = {};

  readonly categoryOptions: { value: EventCategory; label: string }[] = [
    { value: 'PROMOTION', label: 'Promotion' },
    { value: 'FESTIVAL', label: 'Festival' },
    { value: 'WORKSHOP', label: 'Atelier' },
    { value: 'LAUNCH', label: 'Lancement' },
    { value: 'PRIVATE', label: 'Privé' },
    { value: 'CHALLENGE', label: 'Challenge' },
    { value: 'SEASONAL', label: 'Saisonnier' },
  ];

  readonly statusOptions: { value: EventStatus; label: string }[] = [
    { value: 'UPCOMING', label: 'À venir' },
    { value: 'ONGOING', label: 'En cours' },
    { value: 'PAST', label: 'Passé' },
    { value: 'CANCELLED', label: 'Annulé' },
  ];

  readonly rewardTypeOptions: { value: EventRewardType; label: string; icon: string }[] = [
    { value: 'LIMITED_EDITION', label: 'Édition limitée', icon: '💎' },
    { value: 'SEASONAL_THEME', label: 'Thème saisonnier', icon: '🎨' },
    { value: 'EXCLUSIVE_EFFECT', label: 'Effet exclusif', icon: '✨' },
    { value: 'BADGE', label: 'Badge', icon: '🏅' },
    { value: 'POINTS_BONUS', label: 'Bonus de points', icon: '🎯' },
  ];

  readonly colorPresets: { gradient: string; name: string }[] = [
    { gradient: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)', name: 'Sunset' },
    { gradient: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)', name: 'Ocean' },
    { gradient: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)', name: 'Berry' },
    { gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', name: 'Forest' },
    { gradient: 'linear-gradient(135deg, #7C3AED 0%, #DC2626 100%)', name: 'Flamboyant' },
    { gradient: 'linear-gradient(135deg, #F97316 0%, #FACC15 100%)', name: 'Citrus' },
    { gradient: 'linear-gradient(135deg, #6366F1 0%, #06B6D4 100%)', name: 'Indigo' },
    { gradient: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)', name: 'Ruby' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService,
    private restaurantService: RestaurantService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.eventId = this.route.snapshot.paramMap.get('id')!;
    this.restaurantService.findAll(1, 100).subscribe({
      next: (res) => { this.restaurants = res.items; this.cdr.detectChanges(); },
    });
    this.eventService.findOne(this.eventId).subscribe({
      next: (res) => {
        this.populateForm(res.event);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => this.router.navigate(['/app/events']),
    });
  }

  private populateForm(e: PlatformEvent): void {
    this.title = e.title;
    this.description = e.description ?? '';
    this.category = e.category;
    this.status = e.status;
    this.location = e.location ?? '';
    this.startDate = this.toLocalDatetime(e.startDate);
    this.endDate = this.toLocalDatetime(e.endDate);
    this.maxAttendees = e.maxAttendees;
    this.isFeatured = e.isFeatured;
    this.imageColor = e.imageColor ?? this.colorPresets[0].gradient;
    this.restaurantId = e.restaurant?.id ?? '';
    this.existingCoverUrl = e.imageUrl;
    this.rewards = (e.rewards ?? []).map(r => ({
      name: r.name,
      description: r.description ?? '',
      type: r.type,
      quantity: r.quantity,
    }));
  }

  private toLocalDatetime(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // ── Cover image ────────────────────────────────────────────────────────
  onCoverSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.coverFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.coverPreview = e.target?.result as string;
        this.existingCoverUrl = null;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(this.coverFile);
    }
  }

  removeCover(): void {
    this.coverFile = null;
    this.coverPreview = null;
    this.existingCoverUrl = null;
  }

  get displayCover(): string | null {
    if (this.coverPreview) return this.coverPreview;
    if (this.existingCoverUrl) return this.existingCoverUrl;
    return null;
  }

  // ── Rewards ────────────────────────────────────────────────────────────
  addReward(): void {
    this.rewards.push({ name: '', description: '', type: 'LIMITED_EDITION', quantity: 0 });
  }
  removeReward(i: number): void { this.rewards.splice(i, 1); }

  // ── Validation ─────────────────────────────────────────────────────────
  validate(): boolean {
    this.errors = {};
    if (!this.title.trim()) this.errors['title'] = 'Le titre est requis';
    if (!this.startDate) this.errors['startDate'] = 'Date de début requise';
    if (!this.endDate) this.errors['endDate'] = 'Date de fin requise';
    if (this.startDate && this.endDate && new Date(this.startDate) >= new Date(this.endDate))
      this.errors['endDate'] = 'La fin doit être après le début';
    return Object.keys(this.errors).length === 0;
  }

  // ── Submit ─────────────────────────────────────────────────────────────
  save(): void {
    if (!this.validate()) return;
    this.saving = true;

    const payload: UpdateEventPayload = {
      title: this.title.trim(),
      description: this.description.trim() || undefined,
      category: this.category,
      status: this.status,
      location: this.location.trim() || undefined,
      startDate: new Date(this.startDate).toISOString(),
      endDate: new Date(this.endDate).toISOString(),
      maxAttendees: this.maxAttendees || undefined,
      isFeatured: this.isFeatured,
      imageColor: this.imageColor || undefined,
      restaurantId: this.restaurantId || undefined,
      rewards: this.rewards.map(r => ({
        name: r.name.trim(),
        description: r.description.trim() || undefined,
        type: r.type,
        quantity: r.quantity || undefined,
      })),
    };

    this.eventService.update(this.eventId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.saved = true;
        this.cdr.detectChanges();
        setTimeout(() => this.router.navigate(['/app/events', this.eventId]), 1200);
      },
      error: () => {
        this.saving = false;
        this.cdr.detectChanges();
      },
    });
  }

  cancel(): void { this.router.navigate(['/app/events', this.eventId]); }
}
