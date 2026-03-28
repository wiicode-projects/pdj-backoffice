import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import {
  DashboardService,
  DashboardStats,
  RecentUser,
  RecentRestaurant,
} from '../../core/services/dashboard.service';

interface KpiCard {
  icon: string;
  labelKey: string;
  value: number;
  color: string;
}

@Component({
  selector: 'pdj-dashboard',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  loading = true;

  kpiCards: KpiCard[] = [
    { icon: 'users', labelKey: 'DASHBOARD.TOTAL_USERS', value: 0, color: '#3B82F6' },
    { icon: 'restaurants', labelKey: 'DASHBOARD.TOTAL_RESTAURANTS', value: 0, color: '#F59E0B' },
    { icon: 'premium-users', labelKey: 'DASHBOARD.PREMIUM_USERS', value: 0, color: '#8B5CF6' },
    { icon: 'premium-restaurants', labelKey: 'DASHBOARD.PREMIUM_RESTAURANTS', value: 0, color: '#10B981' },
  ];

  recentUsers: RecentUser[] = [];
  recentRestaurants: RecentRestaurant[] = [];

  constructor(
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.dashboardService.getDashboard()
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (data) => {
          this.kpiCards[0].value = data.totalUsers;
          this.kpiCards[1].value = data.totalRestaurants;
          this.kpiCards[2].value = data.premiumUsers;
          this.kpiCards[3].value = data.premiumRestaurants;
          this.recentUsers = data.recentUsers;
          this.recentRestaurants = data.recentRestaurants;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load dashboard:', err);
        },
      });
  }

  getUserName(user: RecentUser): string {
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'ADMIN': return 'badge--admin';
      case 'RESTAURANT': return 'badge--restaurant';
      default: return 'badge--user';
    }
  }
}
