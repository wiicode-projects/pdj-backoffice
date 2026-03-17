import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [loginGuard],
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'forgot-password',
    canActivate: [loginGuard],
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    path: 'reset-password',
    canActivate: [loginGuard],
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password').then((m) => m.ResetPassword),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/components/layout/layout').then((m) => m.Layout),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'subscriptions',
        loadComponent: () =>
          import('./features/subscriptions/subscriptions').then((m) => m.Subscriptions),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/users/users').then((m) => m.Users),
      },
      {
        path: 'restaurants',
        loadComponent: () =>
          import('./features/restaurants/restaurants').then((m) => m.Restaurants),
      },
      {
        path: 'dishes',
        loadComponent: () =>
          import('./features/dishes/dishes').then((m) => m.Dishes),
      },
      {
        path: 'menus',
        loadComponent: () =>
          import('./features/menus/menus').then((m) => m.Menus),
      },
      {
        path: 'locations',
        loadComponent: () =>
          import('./features/locations/locations').then((m) => m.Locations),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
