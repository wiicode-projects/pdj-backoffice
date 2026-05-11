import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  EventService,
  PlatformEvent,
  EventStatus,
  EventCategory,
  EventStats,
} from '../../core/services/event.service';
import { RestaurantService, AdminRestaurant } from '../../core/services/restaurant.service';

type ViewMode = 'grid' | 'list';

@Component({
  selector: 'pdj-events',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './events.html',
  styleUrl: './events.scss',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class Events implements OnInit {
  viewMode: ViewMode = 'grid';
  searchTerm = '';
  statusFilter: EventStatus | '' = '';
  categoryFilter: EventCategory | '' = '';
  selectedEvent: PlatformEvent | null = null;
  loading = true;

  events: PlatformEvent[] = [];
  stats: EventStats | null = null;
  restaurants: AdminRestaurant[] = [];

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

  readonly colorPresets: string[] = [
    'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
    'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
    'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
    'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    'linear-gradient(135deg, #7C3AED 0%, #DC2626 100%)',
    'linear-gradient(135deg, #F97316 0%, #FACC15 100%)',
    'linear-gradient(135deg, #6366F1 0%, #06B6D4 100%)',
    'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
  ];

  constructor(
    private eventService: EventService,
    private restaurantService: RestaurantService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  // ── Data loading ─────────────────────────────────────────────────────────

  private loadData(): void {
    this.loading = true;
    this.eventService.findAll().subscribe({
      next: (res) => {
        this.events = res.events;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });

    this.eventService.getStats().subscribe({
      next: (res) => {
        this.stats = res.stats;
        this.cdr.markForCheck();
      },
    });

    this.restaurantService.findAll(1, 100).subscribe({
      next: (res) => {
        this.restaurants = res.items;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Filtering ────────────────────────────────────────────────────────────

  get filteredEvents(): PlatformEvent[] {
    return this.events.filter((e) => {
      const matchSearch =
        !this.searchTerm ||
        e.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        e.restaurant?.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        e.location?.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchStatus = !this.statusFilter || e.status === this.statusFilter;
      const matchCategory = !this.categoryFilter || e.category === this.categoryFilter;
      return matchSearch && matchStatus && matchCategory;
    });
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────

  get totalEvents(): number { return this.stats?.total ?? this.events.length; }
  get upcomingCount(): number { return this.stats?.upcoming ?? this.events.filter(e => e.status === 'UPCOMING').length; }
  get ongoingCount(): number { return this.stats?.ongoing ?? this.events.filter(e => e.status === 'ONGOING').length; }
  get totalAttendees(): number { return this.stats?.totalAttendees ?? this.events.reduce((s, e) => s + e.currentAttendees, 0); }
  get totalRewards(): number { return this.stats?.totalRewards ?? 0; }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getAttendeePercent(event: PlatformEvent): number {
    if (!event.maxAttendees) return 0;
    return Math.min(100, Math.round((event.currentAttendees / event.maxAttendees) * 100));
  }

  formatDateRange(start: string, end: string): string {
    const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' };
    const s = new Date(start).toLocaleDateString('fr-CH', opts);
    const e = new Date(end).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
    return `${s} → ${e}`;
  }

  formatFull(date: string): string {
    return new Date(date).toLocaleDateString('fr-CH', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  getCategoryLabel(cat: EventCategory): string {
    return this.categoryOptions.find(o => o.value === cat)?.label ?? cat;
  }

  getStatusLabel(status: EventStatus): string {
    return this.statusOptions.find(o => o.value === status)?.label ?? status;
  }

  getRestaurantInitials(event: PlatformEvent): string {
    if (!event.restaurant) return 'PD';
    return event.restaurant.name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  getRestaurantName(event: PlatformEvent): string {
    return event.restaurant?.name ?? 'Plat du Jour';
  }

  setView(mode: ViewMode): void { this.viewMode = mode; }


  // ── Create ──────────────────────────────────────────────────────────────

  openCreateModal(): void {
    this.router.navigate(['/app/events/create']);
  }

  // ── Edit ─────────────────────────────────────────────────────────────

  openEditModal(event: PlatformEvent): void {
    this.router.navigate(['/app/events', event.id, 'edit']);
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  deleteEvent(event: PlatformEvent): void {
    if (!confirm(`Supprimer l'événement « ${event.title} » ?`)) return;
    this.eventService.remove(event.id).subscribe({
      next: () => this.loadData(),
    });
  }

  // ── Cancel ────────────────────────────────────────────────────────────────

  cancelEvent(event: PlatformEvent): void {
    if (!confirm(`Annuler l'événement « ${event.title} » ?`)) return;
    this.eventService.cancel(event.id).subscribe({
      next: () => this.loadData(),
    });
  }

  // ── Toggle featured ───────────────────────────────────────────────────────

  toggleFeatured(event: PlatformEvent): void {
    this.eventService.toggleFeatured(event.id, !event.isFeatured).subscribe({
      next: () => this.loadData(),
    });
  }

  // ── Detail ──────────────────────────────────────────────────────────

  openDetails(event: PlatformEvent): void {
    this.router.navigate(['/app/events', event.id]);
  }

}
