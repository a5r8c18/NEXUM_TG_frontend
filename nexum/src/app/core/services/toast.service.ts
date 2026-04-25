import { Injectable, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  id?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toasts = signal<ToastMessage[]>([]);
  private toastCounter = 0;

  // Observable for components to subscribe to
  toasts$ = this.toasts.asReadonly();

  showSuccess(message: string, duration: number = 3000) {
    this.show({ message, type: 'success', duration });
  }

  showError(message: string, duration: number = 5000) {
    this.show({ message, type: 'error', duration });
  }

  showWarning(message: string, duration: number = 4000) {
    this.show({ message, type: 'warning', duration });
  }

  showInfo(message: string, duration: number = 3000) {
    this.show({ message, type: 'info', duration });
  }

  private show(toast: ToastMessage) {
    const id = `toast-${++this.toastCounter}-${Date.now()}`;
    const newToast: ToastMessage = { ...toast, id };

    // Add new toast
    this.toasts.update(current => [...current, newToast]);

    // Auto-remove after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, newToast.duration);
    }
  }

  remove(id: string) {
    this.toasts.update(current => current.filter(toast => toast.id !== id));
  }

  clear() {
    this.toasts.set([]);
  }

  // Helper methods for common scenarios
  showHttpError(error: any) {
    let message = 'Error de conexión. Por favor, inténtelo nuevamente.';
    
    if (error?.userMessage) {
      message = error.userMessage;
    } else if (error?.message) {
      message = error.message;
    }

    this.showError(message);
  }

  showValidationErrors(errors: string[]) {
    const message = errors.join(', ');
    this.showError(message);
  }

  showOperationSuccess(operation: string) {
    this.showSuccess(`${operation} completado exitosamente.`);
  }

  showOperationError(operation: string) {
    this.showError(`Error al ${operation.toLowerCase()}. Por favor, inténtelo nuevamente.`);
  }
}
