import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { ContextService } from '../services/context.service';

export const contextInterceptor: HttpInterceptorFn = (req, next) => {
  const contextService = inject(ContextService);
  
  // Obtener headers de contexto
  const contextHeaders = contextService.getContextHeaders();
  
  // Clonar la solicitud con los headers de contexto
  const modifiedReq = req.clone({
    setHeaders: contextHeaders
  });
  
  return next(modifiedReq);
};