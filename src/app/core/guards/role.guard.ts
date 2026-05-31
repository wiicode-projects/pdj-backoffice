import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Creates a role-based guard that only allows users with the specified roles.
 * Usage: canActivate: [roleGuard('ADMIN')] or canActivate: [roleGuard('ADMIN', 'RESTAURANT')]
 */
export function roleGuard(...allowedRoles: string[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const userRole = authService.userRole();

    if (userRole && allowedRoles.includes(userRole)) {
      return true;
    }

    // Redirect to dashboard if the user doesn't have the required role
    router.navigate(['/app/dashboard']);
    return false;
  };
}
