import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageSwitcher } from '../language-switcher/language-switcher';

export type UserRole = 'ADMIN' | 'RESTAURANT';

interface NavItem {
  icon: string;
  label: string;
  route: string;
  roles: UserRole[];
}

@Component({
  selector: 'pdj-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TranslateModule, LanguageSwitcher],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {
  collapsed = signal(false);

  private allNavItems: NavItem[] = [
    { icon: 'dashboard', label: 'NAV.DASHBOARD', route: '/app/dashboard', roles: ['ADMIN', 'RESTAURANT'] },
    { icon: 'subscriptions', label: 'NAV.SUBSCRIPTIONS', route: '/app/subscriptions', roles: ['ADMIN'] },
    { icon: 'users', label: 'NAV.USERS', route: '/app/users', roles: ['ADMIN'] },
    { icon: 'restaurants', label: 'NAV.RESTAURANTS', route: '/app/restaurants', roles: ['ADMIN'] },
    { icon: 'dishes', label: 'NAV.DISHES', route: '/app/dishes', roles: ['RESTAURANT'] },
    { icon: 'menus', label: 'NAV.MENUS', route: '/app/menus', roles: ['RESTAURANT'] },
    { icon: 'locations', label: 'NAV.LOCATIONS', route: '/app/locations', roles: ['RESTAURANT'] },
  ];

  readonly navItems = computed(() => {
    const roleName = this.authService.userRole() as UserRole;
    if (!roleName) return this.allNavItems;
    return this.allNavItems.filter((item) => item.roles.includes(roleName));
  });

  constructor(public authService: AuthService) {}

  toggleSidebar(): void {
    this.collapsed.update((v) => !v);
  }

  logout(): void {
    this.authService.logout();
  }

  getUserInitials(): string {
    const user = this.authService.user();
    if (!user) return 'A';
    return (user.firstName?.[0] || '') + (user.lastName?.[0] || '') || 'A';
  }

  getUserName(): string {
    const user = this.authService.user();
    if (!user) return 'Admin';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin';
  }
}
