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

  confirm(configOrTitle?: Partial<ConfirmDialogConfig> | string, p1?: string, config?: Partial<ConfirmDialogConfig>): Promise<boolean> {
    let finalConfig: Partial<ConfirmDialogConfig>;
    
    if (typeof configOrTitle === 'object' && configOrTitle !== null) {
      // Object-style call: confirm({ title, message, ... })
      finalConfig = configOrTitle;
    } else {
      // Parameter-style call: confirm(title, message, config)
      finalConfig = {
        title: configOrTitle || defaultConfig.title,
        message: p1 || defaultConfig.message,
        ...config
      };
    }
    
    this.config.set({ 
      ...defaultConfig, 
      ...finalConfig
    });
    this.isOpen.set(true);
    return new Promise<boolean>(resolve => {
      this.resolveRef = resolve;
    });
  }

  /** Alert-style dialog (info only, no cancel button) */
  alert(config: Partial<ConfirmDialogConfig>): Promise<boolean> {
    return this.confirm(
      {
        ...config,
        cancelText: '',
        type: config.type || 'info',
        confirmText: config.confirmText || 'Aceptar'
      }
    );
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
