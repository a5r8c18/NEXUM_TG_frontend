import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ContextService } from '../services/context.service';

export const permissionsGuard: CanActivateFn = (route, state) => {
  const contextService = inject(ContextService);
  const router = inject(Router);

  // Verificar que hay tenant y company activos
  if (!contextService.hasActiveTenant() || !contextService.hasActiveCompany()) {
    router.navigate(['/dashboard']);
    return false;
  }

  // Aquí se puede agregar lógica de permisos específicos por rol
  // Por ahora, si tiene tenant y company, puede acceder
  const requiredPermission = route.data?.['permission'];
  if (requiredPermission) {
    // TODO: Implementar lógica de verificación de permisos
    // Por ahora, todos los usuarios autenticados con tenant/company tienen acceso
    return true;
  }

  return true;
};