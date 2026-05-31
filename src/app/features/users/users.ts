import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { UserService, AdminUser, PaginatedUsers } from '../../core/services/user.service';

@Component({
  selector: 'pdj-users',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class Users implements OnInit {
  allUsers: AdminUser[] = [];
  loading = false;

  // Pagination
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  readonly limit = 20;

  // Search & filter
  searchQuery = '';
  subscriptionFilter: 'all' | 'premium' | 'free' = 'all';

  // Side panel
  selectedUser: AdminUser | null = null;
  panelOpen = false;

  // Delete confirmation
  confirmDeleteId: string | null = null;
  deleting = false;

  constructor(
    private userService: UserService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    // Fetch a large page to filter client-side (role.name === 'USER')
    this.userService.findAll(this.currentPage, 100)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res: PaginatedUsers) => {
          // Keep only role USER
          this.allUsers = (res.items || []).filter(u => u.role?.name === 'USER');
          this.totalItems = this.allUsers.length;
          this.totalPages = res.meta?.totalPages ?? 1;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load users:', err);
        },
      });
  }

  // ── Computed ─────────────────────────────────────────────────────────────────

  get filteredUsers(): AdminUser[] {
    let list = this.allUsers;

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(u =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q))
      );
    }

    if (this.subscriptionFilter === 'premium') {
      list = list.filter(u => u.membership?.isActive && u.membership?.subscription?.name?.toLowerCase() !== 'classique');
    } else if (this.subscriptionFilter === 'free') {
      list = list.filter(u => !u.membership || !u.membership.isActive);
    }

    return list;
  }

  get totalActive(): number {
    return this.allUsers.filter(u => u.status).length;
  }

  get totalVerified(): number {
    return this.allUsers.filter(u => u.isEmailVerified).length;
  }

  get totalPremium(): number {
    return this.allUsers.filter(u => u.membership?.isActive && u.membership?.subscription?.name?.toLowerCase() !== 'classique').length;
  }

  getUserInitials(user: AdminUser): string {
    const first = user.firstName?.[0] ?? '';
    const last = user.lastName?.[0] ?? '';
    return (first + last).toUpperCase() || user.email[0].toUpperCase();
  }

  getUserName(user: AdminUser): string {
    const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return name || user.email;
  }

  getSubscriptionName(user: AdminUser): string {
    return user.membership?.subscription?.name ?? '—';
  }

  getMembershipStatus(user: AdminUser): 'none' | 'active' | 'inactive' {
    if (!user.membership) return 'none';
    return user.membership.isActive ? 'active' : 'inactive';
  }

  // ── Side panel ───────────────────────────────────────────────────────────────

  openPanel(user: AdminUser): void {
    this.selectedUser = user;
    this.panelOpen = true;
    this.confirmDeleteId = null;
    this.cdr.detectChanges();
  }

  closePanel(): void {
    this.panelOpen = false;
    this.selectedUser = null;
    this.confirmDeleteId = null;
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  askDelete(id: string, event: Event): void {
    event.stopPropagation();
    this.confirmDeleteId = id;
  }

  cancelDelete(): void {
    this.confirmDeleteId = null;
  }

  confirmDelete(id: string): void {
    this.deleting = true;
    this.userService.remove(id)
      .pipe(finalize(() => {
        this.deleting = false;
        this.confirmDeleteId = null;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.allUsers = this.allUsers.filter(u => u.id !== id);
          if (this.selectedUser?.id === id) this.closePanel();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to delete user:', err);
        },
      });
  }
}
