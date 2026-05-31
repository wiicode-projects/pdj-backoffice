import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  EventService,
  PlatformEvent,
} from '../../../core/services/event.service';
import { environment } from '../../../../environments/environment';

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

  // ── Social sharing ────────────────────────────────────────────────────

  linkCopied = false;

  getShareUrl(): string {
    return `${window.location.origin}/events/${this.event?.id ?? ''}`;
  }

  getSocialShareUrl(): string {
    const apiBase = environment.apiUrl.replace(/\/api\/v1\/?$/, '');
    return `${apiBase}/api/v1/events/${this.event?.id ?? ''}/share`;
  }

  getShareText(): string {
    let text = `🎉 Découvrez l'événement « ${this.event?.title ?? ''} » sur Le Plat du Jour !`;
    if (this.event?.description) {
      const desc = this.event.description.length > 120
        ? this.event.description.substring(0, 120) + '…'
        : this.event.description;
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
    window.open('https://www.instagram.com/', '_blank');
  }

  shareOnTikTok(): void {
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

}
