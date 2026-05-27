import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageSwitcher } from '../language-switcher/language-switcher';

export type UserRole = 'ADMIN' | 'RESTAURANT';

export interface NavChild {
  icon: string;
  label: string;
  route: string;
  exact?: boolean;
}

export interface NavItem {
  icon: string;
  label: string;
  route: string;
  roles: UserRole[];
  children?: NavChild[]; // if present, renders as a collapsible submenu parent
}

@Component({
  selector: 'pdj-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FormsModule, TranslateModule, LanguageSwitcher],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {
  collapsed    = signal(false);
  profileOpen  = signal(false);
  openSubmenu  = signal<string | null>(null); // label of the currently-open submenu

  private router = inject(Router);

  private allNavItems: NavItem[] = [
    { icon: 'dashboard', label: 'NAV.DASHBOARD',    route: '/app/dashboard',    roles: ['ADMIN', 'RESTAURANT'] },
    { icon: 'subscriptions', label: 'NAV.SUBSCRIPTIONS', route: '/app/subscriptions', roles: ['ADMIN'] },
    { icon: 'users',    label: 'NAV.USERS',         route: '/app/users',        roles: ['ADMIN'] },
    { icon: 'restaurants', label: 'NAV.RESTAURANTS',route: '/app/restaurants',  roles: ['ADMIN'] },
    { icon: 'subscriptions', label: 'NAV.PAYMENTS', route: '/app/payments',     roles: ['ADMIN'] },
    // ── Mini-jeux submenu ───────────────────────────────────────────────────
    {
      icon: 'restaurants', label: 'NAV.MINI_GAMES_SECTION', route: '', roles: ['ADMIN'],
      children: [
        { icon: 'games',   label: 'NAV.MINI_GAMES_LIST',    route: '/app/mini-games',         exact: true },
        { icon: 'rewards', label: 'NAV.MINI_GAMES_REWARDS', route: '/app/mini-games/rewards' },
      ],
    },
    { icon: 'ads',     label: 'NAV.ADS',            route: '/app/ads',          roles: ['ADMIN'] },
    // ── Boutique submenu ────────────────────────────────────────────────────
    {
      icon: 'shop', label: 'NAV.SHOP_SECTION', route: '', roles: ['ADMIN'],
      children: [
        { icon: 'frites',    label: 'NAV.FRITES_PACKS',       route: '/app/frites-packs' },
        { icon: 'customize', label: 'NAV.SHOP_CUSTOMIZATIONS', route: '/app/shop/customizations' },
        { icon: 'wallet',    label: 'NAV.SHOP_WALLETS',        route: '/app/shop/wallets' },
        { icon: 'tx',        label: 'NAV.SHOP_TRANSACTIONS',   route: '/app/shop/transactions' },
        { icon: 'analytics', label: 'NAV.SHOP_ANALYTICS',      route: '/app/shop/analytics' },
      ],
    },
    // ── Other ────────────────────────────────────────────────────────────────
    { icon: 'tombola',    label: 'NAV.TOMBOLA',    route: '/app/tombola',    roles: ['ADMIN'] },
    { icon: 'statistics', label: 'NAV.STATISTICS', route: '/app/statistics', roles: ['ADMIN'] },
    { icon: 'events',     label: 'NAV.EVENTS',     route: '/app/events',     roles: ['ADMIN'] },
    { icon: 'settings',   label: 'NAV.SETTINGS',   route: '/app/settings',   roles: ['ADMIN'] },
    { icon: 'restaurants', label: 'NAV.MY_RESTAURANTS', route: '/app/my-restaurants', roles: ['RESTAURANT'] },
    { icon: 'subscriptions', label: 'NAV.MEMBERSHIP',   route: '/app/membership',      roles: ['RESTAURANT'] },
    { icon: 'dishes',    label: 'NAV.DISHES',    route: '/app/dishes',    roles: ['RESTAURANT'] },
    { icon: 'menus',     label: 'NAV.MENUS',     route: '/app/menus',     roles: ['RESTAURANT'] },
    { icon: 'locations', label: 'NAV.LOCATIONS', route: '/app/locations', roles: ['RESTAURANT'] },
  ];

  readonly navItems = computed(() => {
    const roleName = this.authService.userRole() as UserRole;
    if (!roleName) return this.allNavItems;
    return this.allNavItems.filter((item) => item.roles.includes(roleName));
  });

  constructor(public authService: AuthService) {
    // Auto-expand the submenu if the current route belongs to it
    this.autoExpandActiveSubmenu();
  }

  /** Returns true if any child route is currently active */
  isSubmenuActive(item: NavItem): boolean {
    if (!item.children) return false;
    const url = this.router.url;
    return item.children.some(c => url.startsWith(c.route));
  }

  isSubmenuOpen(label: string): boolean {
    // Open if explicitly toggled, or if one of its children is active
    if (this.openSubmenu() === label) return true;
    const item = this.allNavItems.find(i => i.label === label);
    return item ? this.isSubmenuActive(item) : false;
  }

  toggleSubmenu(label: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.openSubmenu.update(current => (current === label ? null : label));
    // Expand sidebar if it was collapsed
    if (this.collapsed()) this.collapsed.set(false);
  }

  private autoExpandActiveSubmenu(): void {
    for (const item of this.allNavItems) {
      if (item.children && this.isSubmenuActive(item)) {
        this.openSubmenu.set(item.label);
        break;
      }
    }
  }

  toggleSidebar(): void {
    this.collapsed.update((v) => !v);
    // Close submenu when collapsing
    if (!this.collapsed()) this.openSubmenu.set(null);
  }

  toggleProfile(): void { this.profileOpen.update((v) => !v); }
  closeProfile(): void  { this.profileOpen.set(false); }
  logout(): void        { this.authService.logout(); }

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
