import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { ContextService } from '../services/context.service';

export const contextInterceptor: HttpInterceptorFn = (req, next) => {
  const contextService = inject(ContextService);
  
  console.log(' INTERCEPTOR - Processing request:', req.url);
  
  // Obtener headers de contexto
  const contextHeaders = contextService.getContextHeaders();
  console.log(' INTERCEPTOR - Context headers:', contextHeaders);
  
  // Solo clonar la solicitud si hay headers que agregar
  if (contextHeaders && Object.keys(contextHeaders).length > 0) {
    console.log(' INTERCEPTOR - Adding headers to request');
    const modifiedReq = req.clone({
      headers: req.headers.set('X-Tenant-ID', contextHeaders['X-Tenant-ID'] || '')
                          .set('X-Company-ID', contextHeaders['X-Company-ID'] || '')
                          .set('X-Warehouse-ID', contextHeaders['X-Warehouse-ID'] || '')
    });
    return next(modifiedReq);
  }
  
  console.log(' INTERCEPTOR - No headers to add, passing original request');
  // Si no hay headers, enviar la solicitud original
  return next(req);
};