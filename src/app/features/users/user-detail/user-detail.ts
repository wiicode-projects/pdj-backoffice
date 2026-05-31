import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, finalize, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  UserService,
  AdminUser,
  UserInvoice,
  GamePlay,
} from '../../../core/services/user.service';

type Tab = 'info' | 'payments' | 'games';

@Component({
  selector: 'pdj-user-detail',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './user-detail.html',
  styleUrl: './user-detail.scss',
})
export class UserDetail implements OnInit {
  user: AdminUser | null = null;
  loading = true;
  userId = '';

  activeTab: Tab = 'info';

  // Payment history
  invoices: UserInvoice[] = [];

  // Game history
  plays: GamePlay[] = [];
  playsSummary = { totalPlays: 0, totalPoints: 0 };

  // Delete
  showDeleteDialog = false;
  deleting = false;

  // Ban toggle
  togglingActive = false;



  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id') || '';
    if (this.userId) this.loadData();
  }

  // ── Data loading ─────────────────────────────────────────────────────────────

  loadData(): void {
    this.loading = true;
    forkJoin({
      user: this.userService.findOne(this.userId),
      invoices: this.userService.findInvoices(this.userId).pipe(
        catchError(() => of({ status: 200, invoices: [] }))
      ),
      plays: this.userService.findGamePlays(this.userId).pipe(
        catchError(() => of({ status: 200, plays: [], summary: { totalPlays: 0, totalPoints: 0 } }))
      ),
    })
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (result) => {
          this.user = result.user.user;
          this.invoices = result.invoices.invoices;
          this.plays = result.plays.plays;
          this.playsSummary = result.plays.summary;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  getInitials(): string {
    if (!this.user) return '?';
    const f = this.user.firstName?.[0] ?? '';
    const l = this.user.lastName?.[0] ?? '';
    return (f + l).toUpperCase() || this.user.email[0].toUpperCase();
  }

  getFullName(): string {
    if (!this.user) return '';
    return `${this.user.firstName ?? ''} ${this.user.lastName ?? ''}`.trim() || this.user.email;
  }

  getMembershipStatus(): 'none' | 'active' | 'inactive' {
    if (!this.user?.membership) return 'none';
    return this.user.membership.isActive ? 'active' : 'inactive';
  }

  getAvatarUrl(): string | null {
    return this.user?.profilPicture || null;
  }

  getInvoiceStatusClass(status: string): string {
    switch (status) {
      case 'PAID': return 'status--paid';
      case 'PENDING': return 'status--pending';
      case 'REFUNDED': return 'status--refunded';
      case 'CANCELLED': return 'status--cancelled';
      default: return '';
    }
  }

  getGameSlugLabel(slug: string): string {
    const map: Record<string, string> = {
      spin_win: 'Spin & Win',
      mystery_box: 'Boîte Mystère',
      quiz_flash: 'Quiz Flash',
      referral: 'Parrainage',
    };
    return map[slug] ?? slug;
  }

  getGameSlugIcon(slug: string): string {
    const icons: Record<string, string> = {
      spin_win: '🎰',
      mystery_box: '📦',
      quiz_flash: '⚡',
      referral: '🤝',
    };
    return icons[slug] ?? '🎮';
  }

  getLastPlayed(): string {
    if (this.plays.length === 0) return '—';
    const d = new Date(this.plays[0].createdAt);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  }

  // ── Actions ───────────────────────────────────────────────────────────────────

  setTab(tab: Tab): void {
    this.activeTab = tab;
  }

  goBack(): void {
    this.router.navigate(['/app/users']);
  }

  toggleActive(): void {
    if (!this.user || this.togglingActive) return;
    const newState = !this.user.isActive;
    this.togglingActive = true;
    this.userService.toggleActive(this.user.id, newState)
      .pipe(finalize(() => {
        this.togglingActive = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res) => {
          this.user!.isActive = res.user.isActive;
          this.cdr.detectChanges();
        },
      });
  }

  confirmDelete(): void {
    if (!this.user) return;
    this.deleting = true;
    this.userService.remove(this.user.id)
      .pipe(finalize(() => {
        this.deleting = false;
        this.showDeleteDialog = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => this.router.navigate(['/app/users']),
      });
  }
}
