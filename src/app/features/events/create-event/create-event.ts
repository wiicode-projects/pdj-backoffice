import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  EventService,
  EventCategory,
  CreateEventPayload,
} from '../../../core/services/event.service';
import { RestaurantService, AdminRestaurant } from '../../../core/services/restaurant.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'pdj-create-event',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-event.html',
  styleUrl: './create-event.scss',
})
export class CreateEvent implements OnInit {
  // Steps: 1 = info, 2 = preview
  currentStep = 1;
  readonly totalSteps = 2;

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

  // Cover image
  coverFile: File | null = null;
  coverPreview: string | null = null;

  // State
  restaurants: AdminRestaurant[] = [];
  submitting = false;
  submitted = false;
  errors: Record<string, string> = {};

  // Created event ID for sharing
  createdEventId: string | null = null;

  readonly categoryOptions: { value: EventCategory; label: string }[] = [
    { value: 'PROMOTION', label: 'Promotion' },
    { value: 'FESTIVAL', label: 'Festival' },
    { value: 'WORKSHOP', label: 'Atelier' },
    { value: 'LAUNCH', label: 'Lancement' },
    { value: 'PRIVATE', label: 'Privé' },
    { value: 'CHALLENGE', label: 'Challenge' },
    { value: 'SEASONAL', label: 'Saisonnier' },
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

    this.eventService.createWithFormData(fd).subscribe({
      next: (res) => {
        this.submitting = false;
        this.submitted = true;
        this.createdEventId = res.event?.id ?? null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.submitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  goToEvents(): void { this.router.navigate(['/app/events']); }

  // ── Social sharing ────────────────────────────────────────────────────

  getShareUrl(): string {
    const baseUrl = window.location.origin;
    return this.createdEventId
      ? `${baseUrl}/events/${this.createdEventId}`
      : `${baseUrl}/events`;
  }

  getSocialShareUrl(): string {
    if (!this.createdEventId) return this.getShareUrl();
    const apiBase = environment.apiUrl.replace(/\/api\/v1\/?$/, '');
    return `${apiBase}/api/v1/events/${this.createdEventId}/share`;
  }

  getShareText(): string {
    let text = `🎉 Découvrez notre événement « ${this.title} » sur Le Plat du Jour !`;
    if (this.description) {
      const desc = this.description.length > 120
        ? this.description.substring(0, 120) + '…'
        : this.description;
      text += `\n\n${desc}`;
    }
    return text;
  }

  shareOnFacebook(): void {
    const url = encodeURIComponent(this.getSocialShareUrl());
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
  }

  shareOnTwitter(): void {
    const url = encodeURIComponent(this.getSocialShareUrl());
    const text = encodeURIComponent(this.getShareText());
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank', 'width=600,height=400');
  }

  shareOnInstagram(): void {
    // Instagram doesn't have a direct web share URL; open Instagram with a prompt
    window.open('https://www.instagram.com/', '_blank');
  }

  shareOnTikTok(): void {
    // TikTok doesn't have a direct web share URL; open TikTok
    window.open('https://www.tiktok.com/', '_blank');
  }

  copyShareLink(): void {
    navigator.clipboard.writeText(this.getShareUrl()).then(() => {
      this.linkCopied = true;
      setTimeout(() => {
        this.linkCopied = false;
        this.cdr.detectChanges();
      }, 2000);
      this.cdr.detectChanges();
    });
  }

  linkCopied = false;

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
