import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  EventService,
  PlatformEvent,
  EventRewardType,
} from '../../../core/services/event.service';

@Component({
  selector: 'pdj-event-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './event-detail.html',
  styleUrl: './event-detail.scss',
})
export class EventDetail implements OnInit {
  event: PlatformEvent | null = null;
  loading = true;

  readonly statusLabels: Record<string, string> = {
    UPCOMING: 'À venir', ONGOING: 'En cours', PAST: 'Passé', CANCELLED: 'Annulé',
  };
  readonly categoryLabels: Record<string, string> = {
    PROMOTION: 'Promotion', FESTIVAL: 'Festival', WORKSHOP: 'Atelier',
    LAUNCH: 'Lancement', PRIVATE: 'Privé', CHALLENGE: 'Challenge', SEASONAL: 'Saisonnier',
  };
  readonly rewardTypeLabels: Record<string, { label: string; icon: string }> = {
    LIMITED_EDITION: { label: 'Édition limitée', icon: '💎' },
    SEASONAL_THEME: { label: 'Thème saisonnier', icon: '🎨' },
    EXCLUSIVE_EFFECT: { label: 'Effet exclusif', icon: '✨' },
    BADGE: { label: 'Badge', icon: '🏅' },
    POINTS_BONUS: { label: 'Bonus de points', icon: '🎯' },
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.eventService.findOne(id).subscribe({
      next: (res) => {
        this.event = res.event;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.router.navigate(['/app/events']);
      },
    });
  }

  goBack(): void { this.router.navigate(['/app/events']); }
  goToEdit(): void { this.router.navigate(['/app/events', this.event!.id, 'edit']); }

  deleteEvent(): void {
    if (!this.event || !confirm(`Supprimer l'événement « ${this.event.title} » ?`)) return;
    this.eventService.remove(this.event.id).subscribe({ next: () => this.goBack() });
  }

  cancelEvent(): void {
    if (!this.event || !confirm(`Annuler l'événement « ${this.event.title} » ?`)) return;
    this.eventService.cancel(this.event.id).subscribe({
      next: (res) => { this.event = res.event; this.cdr.detectChanges(); },
    });
  }

  toggleFeatured(): void {
    if (!this.event) return;
    this.eventService.toggleFeatured(this.event.id, !this.event.isFeatured).subscribe({
      next: (res) => { this.event = res.event; this.cdr.detectChanges(); },
    });
  }

  getStatusLabel(): string { return this.statusLabels[this.event?.status ?? ''] ?? ''; }
  getCategoryLabel(): string { return this.categoryLabels[this.event?.category ?? ''] ?? ''; }
  getRestaurantName(): string { return this.event?.restaurant?.name ?? 'Plat du Jour'; }

  getRewardIcon(type: EventRewardType): string { return this.rewardTypeLabels[type]?.icon ?? '🎁'; }
  getRewardLabel(type: EventRewardType): string { return this.rewardTypeLabels[type]?.label ?? type; }

  getAttendeePercent(): number {
    if (!this.event || !this.event.maxAttendees) return 0;
    return Math.min(100, (this.event.currentAttendees / this.event.maxAttendees) * 100);
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-CH', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

}
