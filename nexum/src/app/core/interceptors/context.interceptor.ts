import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { ContextService } from '../services/context.service';
import { AuthService } from '../services/auth.service';

export const contextInterceptor: HttpInterceptorFn = (req, next) => {
  const contextService = inject(ContextService);
  const authService = inject(AuthService);

  let headers = req.headers;

  // Agregar Bearer token JWT si existe
  const token = authService.getToken();
  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  // Agregar headers de contexto
  const contextHeaders = contextService.getContextHeaders();
  if (contextHeaders && Object.keys(contextHeaders).length > 0) {
    if (contextHeaders['X-Tenant-ID']) {
      headers = headers.set('X-Tenant-ID', contextHeaders['X-Tenant-ID']);
    }
    if (contextHeaders['X-Company-ID']) {
      headers = headers.set('X-Company-ID', contextHeaders['X-Company-ID']);
    }
    if (contextHeaders['X-Warehouse-ID']) {
      headers = headers.set('X-Warehouse-ID', contextHeaders['X-Warehouse-ID']);
    }
  }

  const modifiedReq = req.clone({ headers });
  return next(modifiedReq);
};