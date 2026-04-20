import { Injectable, ErrorHandler, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { LoggerService } from '../services/logger.service';

@Injectable({
  providedIn: 'root'
})
export class GlobalErrorHandler implements ErrorHandler {
  private readonly logger = inject(LoggerService);

  handleError(error: any): void {
    // Log the error
    this.logError(error);

    // Show user-friendly error message
    this.showUserFriendlyMessage(error);
  }

  private logError(error: any): void {
    const timestamp = new Date().toISOString();
    const errorInfo = {
      timestamp,
      message: error.message || 'Unknown error',
      stack: error.stack,
      type: error.constructor.name,
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: this.getCurrentUserId(),
    };

    if (error instanceof HttpErrorResponse) {
      this.logger.error('HTTP Error', {
        ...errorInfo,
        status: error.status,
        statusText: error.statusText,
        url: error.url,
      });
    } else if (error instanceof Error) {
      this.logger.error('JavaScript Error', errorInfo);
    } else {
      this.logger.error('Unknown Error', errorInfo);
    }
  }

  private showUserFriendlyMessage(error: any): void {
    let userMessage = 'Ha ocurrido un error inesperado. Por favor, inténtelo de nuevo.';

    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 0:
          userMessage = 'No se puede conectar al servidor. Verifique su conexión a internet.';
          break;
        case 400:
          userMessage = 'Los datos enviados no son válidos. Por favor, revise el formulario.';
          break;
        case 401:
          userMessage = 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.';
          break;
        case 403:
          userMessage = 'No tiene permisos para realizar esta acción.';
          break;
        case 404:
          userMessage = 'El recurso solicitado no fue encontrado.';
          break;
        case 429:
          userMessage = 'Demasiadas solicitudes. Por favor, espere un momento e inténtelo de nuevo.';
          break;
        case 500:
          userMessage = 'Error interno del servidor. Por favor, inténtelo más tarde.';
          break;
        case 503:
          userMessage = 'El servicio no está disponible temporalmente.';
          break;
        default:
          if (error.status >= 400 && error.status < 500) {
            userMessage = 'Error en la solicitud. Por favor, revise los datos e inténtelo de nuevo.';
          } else {
            userMessage = 'Error del servidor. Por favor, inténtelo más tarde.';
          }
      }
    }

    // Show the error message to the user
    this.showErrorNotification(userMessage);
  }

  private showErrorNotification(message: string): void {
    // Try to use a toast/notification service if available
    // For now, use a simple alert
    console.error('Error shown to user:', message);
    
    // In a real implementation, you would use a toast/snackbar service
    // Example: this.notificationService.showError(message);
  }

  private getCurrentUserId(): string | null {
    // Try to get current user ID from localStorage or a user service
    try {
      const user = localStorage.getItem('currentUser');
      if (user) {
        const parsedUser = JSON.parse(user);
        return parsedUser.id || null;
      }
    } catch {
      // Ignore errors getting user ID
    }
    return null;
  }
}
