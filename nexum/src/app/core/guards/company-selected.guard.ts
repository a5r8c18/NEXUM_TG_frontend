import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ContextService } from '../services/context.service';

export const companySelectedGuard: CanActivateFn = (route, state) => {
  const contextService = inject(ContextService);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Verificar autenticación
  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  // Superadmin no necesita empresa seleccionada (gestiona la plataforma)
  const currentUser = authService.currentUser();
  if (currentUser?.role === 'superadmin') {
    return true;
  }

  // Obtener el tenant del usuario actual
  const userTenant = authService.getCurrentUserTenant();
  
  if (!userTenant) {
    router.navigate(['/login']);
    return false;
  }

  // Para SINGLE_COMPANY, asignar automáticamente la empresa y permitir acceso
  if (userTenant.type === 'SINGLE_COMPANY') {
    // Asignar empresa automáticamente si no hay una activa
    if (!contextService.hasActiveCompany()) {
      // Usar el companyId del usuario autenticado del JWT
      const userCompanyId = authService.getCurrentCompanyId();
      
      if (userCompanyId) {
        contextService.setCurrentCompany({
          id: userCompanyId.toString(),
          name: userTenant.name,
          tenantId: currentUser?.tenantId || '',
          taxId: 'TAX-DEMO',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }
    return true;
  }

  // Si es MULTI_COMPANY, requiere company selection
  if (!contextService.hasActiveCompany()) {
    router.navigate(['/company-selection']);
    return false;
  }

  return true;
};