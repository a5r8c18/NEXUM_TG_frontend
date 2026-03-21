import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ContextService } from '../services/context.service';

export const tenantSelectedGuard: CanActivateFn = (route, state) => {
  const contextService = inject(ContextService);
  const router = inject(Router);

  if (!contextService.hasActiveTenant()) {
    // Redirigir a selección de tenant o login
    router.navigate(['/tenant-selection']);
    return false;
  }

  return true;
};