import { Injectable, signal } from '@angular/core';

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  type: 'danger' | 'warning' | 'info' | 'success';
}

const defaultConfig: ConfirmDialogConfig = {
  title: 'Confirmar acción',
  message: '¿Está seguro de continuar?',
  confirmText: 'Confirmar',
  cancelText: 'Cancelar',
  type: 'danger'
};

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  isOpen = signal(false);
  config = signal<ConfirmDialogConfig>({ ...defaultConfig });

  private resolveRef: ((value: boolean) => void) | null = null;

  confirm(config: Partial<ConfirmDialogConfig>): Promise<boolean> {
    this.config.set({ ...defaultConfig, ...config });
    this.isOpen.set(true);
    return new Promise<boolean>(resolve => {
      this.resolveRef = resolve;
    });
  }

  /** Alert-style dialog (info only, no cancel button) */
  alert(config: Partial<ConfirmDialogConfig>): Promise<boolean> {
    return this.confirm({
      ...config,
      cancelText: '',
      type: config.type || 'info',
      confirmText: config.confirmText || 'Aceptar'
    });
  }

  accept(): void {
    this.isOpen.set(false);
    this.resolveRef?.(true);
    this.resolveRef = null;
  }

  cancel(): void {
    this.isOpen.set(false);
    this.resolveRef?.(false);
    this.resolveRef = null;
  }
}
