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
    console.log('🔐 INTERCEPTOR - Token agregado para:', {
      url: req.url,
      method: req.method,
      tokenLength: token.length,
      tokenPreview: token.substring(0, 20) + '...'
    });
  } else {
    console.log('❌ INTERCEPTOR - No token encontrado para:', {
      url: req.url,
      method: req.method,
      isAuthenticated: authService.isAuthenticated()
    });
  }

  // Agregar headers de contexto
  const contextHeaders = contextService.getContextHeaders();
  if (contextHeaders && Object.keys(contextHeaders).length > 0) {
    if (contextHeaders['X-Tenant-ID']) {
      headers = headers.set('X-Tenant-ID', contextHeaders['X-Tenant-ID']);
    }
    if (contextHeaders['X-Company-ID']) {
      headers = headers.set('X-Company-ID', contextHeaders['X-Company-ID']);
      console.log('🏢 INTERCEPTOR - X-Company-ID añadido:', contextHeaders['X-Company-ID'], 'URL:', req.url);
    } else {
      console.warn('⚠️ INTERCEPTOR - Sin X-Company-ID para:', req.url, '| contextCompany:', contextService.currentCompany()?.id ?? 'null');
    }
    if (contextHeaders['X-Warehouse-ID']) {
      headers = headers.set('X-Warehouse-ID', contextHeaders['X-Warehouse-ID']);
    }
  } else {
    console.warn('⚠️ INTERCEPTOR - Sin contextHeaders para:', req.url);
  }

  const modifiedReq = req.clone({ headers });
  return next(modifiedReq);
};