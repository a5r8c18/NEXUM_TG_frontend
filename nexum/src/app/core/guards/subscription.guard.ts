import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SubscriptionService } from '../services/subscription.service';
import { AuthService } from '../services/auth.service';

export const subscriptionGuard: CanActivateFn = async () => {
  const subscriptionService = inject(SubscriptionService);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Superadmin always has access (Teneduria Garcia)
  if (authService.isSuperadmin()) {
    return true;
  }

  try {
    const access = await subscriptionService.checkAccess();

    if (!access.hasAccess) {
      router.navigate(['/subscription-blocked']);
      return false;
    }

    return true;
  } catch {
    // If check fails (offline), allow access
    return true;
  }
};
