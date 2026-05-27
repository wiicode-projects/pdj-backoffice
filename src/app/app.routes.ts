import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

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
    path: 'verify-otp',
    canActivate: [loginGuard],
    loadComponent: () =>
      import('./features/auth/verify-otp/verify-otp').then((m) => m.VerifyOtp),
  },
  {
    path: 'events/:id',
    loadComponent: () =>
      import('./features/events/public-event/public-event').then((m) => m.PublicEvent),
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
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/subscriptions/subscriptions').then((m) => m.Subscriptions),
      },
      {
        path: 'subscriptions/:id',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/subscriptions/subscription-detail/subscription-detail').then((m) => m.SubscriptionDetail),
      },
      {
        path: 'users',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/users/users').then((m) => m.Users),
      },
      {
        path: 'users/:id',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/users/user-detail/user-detail').then((m) => m.UserDetail),
      },
      {
        path: 'restaurants',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/restaurants/restaurants').then((m) => m.Restaurants),
      },
      {
        path: 'restaurants/:id',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/restaurants/restaurant-detail/restaurant-detail').then((m) => m.RestaurantDetail),
      },
      {
        path: 'payments',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/payments/payments').then((m) => m.Payments),
      },
      {
        path: 'mini-games',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/mini-games/mini-games').then((m) => m.MiniGames),
      },
      {
        path: 'mini-games/rewards',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/mini-games/mini-game-rewards/mini-game-rewards').then((m) => m.MiniGameRewards),
      },
      {
        path: 'mini-games/:id',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/mini-games/mini-game-detail/mini-game-detail').then((m) => m.MiniGameDetail),
      },
      {
        path: 'tombola/:id',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/tombola/tombola-detail/tombola-detail').then((m) => m.TombolaDetail),
      },
      {
        path: 'tombola',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/tombola/tombola').then((m) => m.Tombola),
      },
      {
        path: 'ads',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/ads/ads').then((m) => m.Ads),
      },
      {
        path: 'frites-packs',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/frites-packs/frites-packs').then((m) => m.FritesPacks),
      },
      {
        path: 'shop/customizations',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/shop-customizations/shop-customizations').then((m) => m.ShopCustomizations),
      },
      {
        path: 'shop/wallets',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/shop-wallets/shop-wallets').then((m) => m.ShopWallets),
      },
      {
        path: 'shop/transactions',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/shop-transactions/shop-transactions').then((m) => m.ShopTransactions),
      },
      {
        path: 'shop/analytics',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/shop-analytics/shop-analytics').then((m) => m.ShopAnalytics),
      },
      {
        path: 'statistics',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/statistics/statistics').then((m) => m.Statistics),
      },
      {
        path: 'settings',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/settings/settings').then((m) => m.Settings),
      },
      {
        path: 'events',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/events/events').then((m) => m.Events),
      },
      {
        path: 'events/create',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/events/create-event/create-event').then((m) => m.CreateEvent),
      },
      {
        path: 'events/:id',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/events/event-detail/event-detail').then((m) => m.EventDetail),
      },
      {
        path: 'events/:id/edit',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/events/edit-event/edit-event').then((m) => m.EditEvent),
      },
      {
        path: 'my-restaurants',
        canActivate: [roleGuard('RESTAURANT')],
        loadComponent: () =>
          import('./features/my-restaurants/my-restaurants').then((m) => m.MyRestaurants),
      },
      {
        path: 'manage-restaurant',
        canActivate: [roleGuard('RESTAURANT')],
        loadComponent: () =>
          import('./features/my-restaurants/manage-restaurant/manage-restaurant').then((m) => m.ManageRestaurant),
      },
      {
        path: 'membership',
        canActivate: [roleGuard('RESTAURANT')],
        loadComponent: () =>
          import('./features/membership/membership').then((m) => m.Membership),
      },
      {
        path: 'dishes/create',
        canActivate: [roleGuard('RESTAURANT')],
        loadComponent: () =>
          import('./features/dishes/create-dish/create-dish').then((m) => m.CreateDish),
      },
      {
        path: 'dishes/:id/edit',
        canActivate: [roleGuard('RESTAURANT')],
        loadComponent: () =>
          import('./features/dishes/edit-dish/edit-dish').then((m) => m.EditDish),
      },
      {
        path: 'dishes/:id',
        canActivate: [roleGuard('RESTAURANT')],
        loadComponent: () =>
          import('./features/dishes/dish-detail/dish-detail').then((m) => m.DishDetail),
      },
      {
        path: 'dishes',
        canActivate: [roleGuard('RESTAURANT')],
        loadComponent: () =>
          import('./features/dishes/dishes').then((m) => m.Dishes),
      },
      {
        path: 'menus/:id',
        canActivate: [roleGuard('RESTAURANT')],
        loadComponent: () =>
          import('./features/menus/menu-detail/menu-detail').then((m) => m.MenuDetail),
      },
      {
        path: 'menus',
        canActivate: [roleGuard('RESTAURANT')],
        loadComponent: () =>
          import('./features/menus/menus').then((m) => m.Menus),
      },
      {
        path: 'locations',
        canActivate: [roleGuard('RESTAURANT')],
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
