import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { inject } from '@angular/core';
import { ToastService } from '../core/services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);

  return next(req).pipe(
    tap(event => {
      // Log successful responses for debugging
      if (event.type === 0) { // HttpEventType.Sent
        console.log(`📤 [${req.method}] ${req.url}`, {
          url: req.url,
          method: req.method,
          timestamp: new Date().toISOString()
        });
      } else if (event.type === 4) { // HttpEventType.Response
        console.log(`✅ [${event.status}] ${req.method} ${req.url}`, {
          url: req.url,
          method: req.method,
          status: event.status,
          timestamp: new Date().toISOString()
        });
      }
    }),
    catchError((error: HttpErrorResponse) => {
      // Log error details for debugging
      console.error(`❌ [${error.status}] ${req.method} ${req.url}`, {
        url: req.url,
        method: req.method,
        status: error.status,
        statusText: error.statusText,
        message: error.message,
        timestamp: new Date().toISOString(),
        error: error.error
      });

      // Extract user-friendly error message
      let errorMessage = 'Ha ocurrido un error inesperado. Por favor, inténtelo nuevamente.';
      
      if (error.error) {
        // Backend error with structured response
        if (typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (error.error.message) {
          errorMessage = error.error.message;
        } else if (error.error.error) {
          errorMessage = error.error.error;
        } else if (Array.isArray(error.error.message)) {
          errorMessage = error.error.message.join(', ');
        }
      } else if (error.message) {
        // Network or other client-side error
        errorMessage = error.message;
      }

      // Specific handling for common HTTP status codes
      switch (error.status) {
        case 400:
          errorMessage = error.error?.message || 'Datos inválidos. Por favor, verifique la información.';
          break;
        case 401:
          errorMessage = 'No autorizado. Por favor, inicie sesión nuevamente.';
          break;
        case 403:
          errorMessage = 'Acceso denegado. No tiene permisos para realizar esta acción.';
          break;
        case 404:
          errorMessage = 'Recurso no encontrado.';
          break;
        case 409:
          errorMessage = 'Conflicto de datos. El recurso ya existe o está en uso.';
          break;
        case 422:
          errorMessage = error.error?.message || 'Error de validación. Por favor, revise los datos ingresados.';
          break;
        case 429:
          errorMessage = 'Demasiadas solicitudes. Por favor, espere un momento.';
          break;
        case 500:
          errorMessage = 'Error interno del servidor. Por favor, contacte al administrador.';
          break;
        case 502:
        case 503:
        case 504:
          errorMessage = 'Servicio no disponible. Por favor, inténtelo más tarde.';
          break;
      }

      // Show toast notification
      toastService.showError(errorMessage);

      // Return formatted error for component-level handling if needed
      return throwError(() => ({
        ...error,
        userMessage: errorMessage,
        timestamp: new Date().toISOString()
      }));
    })
  );
};
