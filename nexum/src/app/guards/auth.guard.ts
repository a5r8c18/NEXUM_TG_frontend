import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../shared/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // En modo desarrollo, permitir acceso directo al dashboard
  if (authService.isDevelopment()) {
    // Si no hay sesión, crear una automáticamente
    if (!authService.isAuthenticated()) {
      authService.skipAuth();
    }
    return true;
  }

  // En producción, verificar autenticación normal
  if (authService.isAuthenticated()) {
    return true;
  }

  // Si no está autenticado, redirigir al login
  return router.createUrlTree(['/login']);
};
