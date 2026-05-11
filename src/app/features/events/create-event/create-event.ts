import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  EventService,
  EventCategory,
  EventRewardType,
  CreateEventPayload,
} from '../../../core/services/event.service';
import { RestaurantService, AdminRestaurant } from '../../../core/services/restaurant.service';

interface RewardFormItem {
  name: string;
  description: string;
  type: EventRewardType;
  quantity: number;
}

@Component({
  selector: 'pdj-create-event',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-event.html',
  styleUrl: './create-event.scss',
})
export class CreateEvent implements OnInit {
  // Steps: 1 = info, 2 = rewards, 3 = preview
  currentStep = 1;
  readonly totalSteps = 3;

  // Form
  title = '';
  description = '';
  category: EventCategory = 'PROMOTION';
  location = '';
  startDate = '';
  endDate = '';
  maxAttendees = 0;
  isFeatured = false;
  imageColor = 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)';
  restaurantId = '';
  rewards: RewardFormItem[] = [];

  // Cover image
  coverFile: File | null = null;
  coverPreview: string | null = null;

  // State
  restaurants: AdminRestaurant[] = [];
  submitting = false;
  submitted = false;
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
    private eventService: EventService,
    private restaurantService: RestaurantService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.restaurantService.findAll(1, 100).subscribe({
      next: (res) => {
        this.restaurants = res.items;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Navigation ─────────────────────────────────────────────────────────

  goToStep(step: number): void {
    if (step === 2 && !this.validateStep1()) return;
    if (step === 3 && !this.validateStep2()) return;
    this.currentStep = step;
  }

  nextStep(): void { this.goToStep(this.currentStep + 1); }
  prevStep(): void {
    if (this.currentStep > 1) this.currentStep--;
    else this.router.navigate(['/app/events']);
  }

  cancel(): void { this.router.navigate(['/app/events']); }

  // ── Validation ─────────────────────────────────────────────────────────

  validateStep1(): boolean {
    this.errors = {};
    if (!this.title.trim()) this.errors['title'] = 'Le titre est requis';
    if (!this.startDate) this.errors['startDate'] = 'La date de début est requise';
    if (!this.endDate) this.errors['endDate'] = 'La date de fin est requise';
    if (this.startDate && this.endDate && new Date(this.startDate) >= new Date(this.endDate))
      this.errors['endDate'] = 'La date de fin doit être après la date de début';
    return Object.keys(this.errors).length === 0;
  }

  validateStep2(): boolean {
    this.errors = {};
    for (let i = 0; i < this.rewards.length; i++) {
      if (!this.rewards[i].name.trim()) {
        this.errors[`reward_${i}`] = 'Le nom de la récompense est requis';
      }
    }
    return Object.keys(this.errors).length === 0;
  }

  // ── Rewards ────────────────────────────────────────────────────────────

  addReward(): void {
    this.rewards.push({ name: '', description: '', type: 'LIMITED_EDITION', quantity: 0 });
  }

  removeReward(i: number): void { this.rewards.splice(i, 1); }

  getRewardTypeLabel(type: EventRewardType): string {
    return this.rewardTypeOptions.find(o => o.value === type)?.label ?? type;
  }

  getRewardTypeIcon(type: EventRewardType): string {
    return this.rewardTypeOptions.find(o => o.value === type)?.icon ?? '🎁';
  }

  // ── Cover image ────────────────────────────────────────────────────────

  onCoverSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.coverFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.coverPreview = e.target?.result as string;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(this.coverFile);
    }
  }

  removeCover(): void {
    this.coverFile = null;
    this.coverPreview = null;
  }

  // ── Submit ─────────────────────────────────────────────────────────────

  submit(): void {
    this.submitting = true;

    const fd = new FormData();
    fd.append('title', this.title.trim());
    if (this.description.trim()) fd.append('description', this.description.trim());
    fd.append('category', this.category);
    if (this.location.trim()) fd.append('location', this.location.trim());
    fd.append('startDate', new Date(this.startDate).toISOString());
    fd.append('endDate', new Date(this.endDate).toISOString());
    if (this.maxAttendees) fd.append('maxAttendees', String(this.maxAttendees));
    fd.append('isFeatured', String(this.isFeatured));
    fd.append('imageColor', this.imageColor);
    if (this.restaurantId) fd.append('restaurantId', this.restaurantId);
    if (this.coverFile) fd.append('coverImage', this.coverFile, this.coverFile.name);

    if (this.rewards.length) {
      fd.append('rewards', JSON.stringify(
        this.rewards.map(r => ({
          name: r.name.trim(),
          description: r.description.trim() || undefined,
          type: r.type,
          quantity: r.quantity || undefined,
        }))
      ));
    }

    this.eventService.createWithFormData(fd).subscribe({
      next: () => {
        this.submitting = false;
        this.submitted = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.submitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  goToEvents(): void { this.router.navigate(['/app/events']); }

  // ── Helpers ────────────────────────────────────────────────────────────

  getCategoryLabel(cat: EventCategory): string {
    return this.categoryOptions.find(o => o.value === cat)?.label ?? cat;
  }

  getRestaurantName(): string {
    if (!this.restaurantId) return 'Aucun';
    return this.restaurants.find(r => r.id === this.restaurantId)?.name ?? 'Aucun';
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-CH', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
}
