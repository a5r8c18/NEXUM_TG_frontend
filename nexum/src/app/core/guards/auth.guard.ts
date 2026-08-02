import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && !authService.isTokenExpired()) {
    return true;
  }

  // El access token expiró: intentar renovarlo antes de mandar al login,
  // así una sesión con refresh token válido no pierde los datos cargados.
  if (authService.getRefreshToken()) {
    const newToken = await authService.refreshSession();
    if (newToken) {
      return true;
    }
  }

  authService.clearSession();
  return router.createUrlTree(['/login']);
};
