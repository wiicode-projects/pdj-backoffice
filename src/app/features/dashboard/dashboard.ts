import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

interface KpiCard {
  icon: string;
  labelKey: string;
  value: number;
  color: string;
}

interface RecentUser {
  name: string;
  email: string;
  role: string;
  date: string;
}

interface RecentRestaurant {
  name: string;
  type: string;
  city: string;
  date: string;
}

@Component({
  selector: 'pdj-dashboard',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  kpiCards: KpiCard[] = [
    { icon: 'users', labelKey: 'DASHBOARD.TOTAL_USERS', value: 248, color: '#3B82F6' },
    { icon: 'restaurants', labelKey: 'DASHBOARD.TOTAL_RESTAURANTS', value: 42, color: '#F59E0B' },
    { icon: 'premium-users', labelKey: 'DASHBOARD.PREMIUM_USERS', value: 18, color: '#8B5CF6' },
    { icon: 'premium-restaurants', labelKey: 'DASHBOARD.PREMIUM_RESTAURANTS', value: 27, color: '#10B981' },
  ];

  recentUsers: RecentUser[] = [
    { name: 'Sophie Martin', email: 'sophie@example.com', role: 'USER', date: '16 Mar 2026' },
    { name: 'Jean Dupont', email: 'jean@restaurant.ch', role: 'RESTAURANT', date: '15 Mar 2026' },
    { name: 'Marc Bern', email: 'marc@leplatdujour.ch', role: 'ADMIN', date: '14 Mar 2026' },
    { name: 'Claire Dubois', email: 'claire@example.com', role: 'USER', date: '13 Mar 2026' },
    { name: 'Luca Rossi', email: 'luca@restaurant.ch', role: 'RESTAURANT', date: '12 Mar 2026' },
  ];

  recentRestaurants: RecentRestaurant[] = [
    { name: 'Le Petit Bistro', type: 'RESTAURANT', city: 'Lausanne', date: '16 Mar 2026' },
    { name: 'Pasta Fresca', type: 'RESTAURANT', city: 'Genève', date: '15 Mar 2026' },
    { name: 'Burger Express', type: 'FOOD_TRUCK', city: 'Zürich', date: '14 Mar 2026' },
    { name: 'Sushi Zen', type: 'RESTAURANT', city: 'Bern', date: '13 Mar 2026' },
    { name: 'Crêperie du Lac', type: 'RESTAURANT', city: 'Neuchâtel', date: '12 Mar 2026' },
  ];

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'ADMIN': return 'badge--admin';
      case 'RESTAURANT': return 'badge--restaurant';
      default: return 'badge--user';
    }
  }
}
