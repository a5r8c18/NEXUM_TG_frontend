import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ContextService } from '../services/context.service';
import { AuthService } from '../services/auth.service';

export const permissionsGuard: CanActivateFn = (route, state) => {
  const contextService = inject(ContextService);
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.currentUser();
  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  // Superadmin siempre tiene acceso completo
  if (user.role === 'superadmin') {
    return true;
  }

  // Verificar que hay tenant y company activos
  if (!contextService.hasActiveTenant() || !contextService.hasActiveCompany()) {
    router.navigate(['/dashboard']);
    return false;
  }

  // Verificar permisos específicos por rol
  // Nota: superadmin ya retornó true arriba, aquí solo quedan admin/user/facturador
  const requiredRole = route.data?.['requiredRole'];
  if (requiredRole) {
    if (requiredRole === 'superadmin') {
      // Solo superadmin puede acceder, pero ya retornó arriba — si llega aquí, no es superadmin
      router.navigate(['/dashboard']);
      return false;
    }
    if (requiredRole === 'admin' && user.role !== 'admin') {
      router.navigate(['/dashboard']);
      return false;
    }
  }

  return true;
};