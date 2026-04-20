import { Injectable, inject, signal } from '@angular/core';
import { offlineDb, SyncQueueItem } from './offline-database';
import { SyncQueueService } from './sync-queue.service';

export interface ConflictItem {
  id: number;
  entity: string;
  action: string;
  entityId?: string;
  payload: any;
  errorMessage: string;
  timestamp: string;
  retries: number;
}

export type ConflictResolution = 'retry' | 'force' | 'discard';

@Injectable({ providedIn: 'root' })
export class ConflictResolverService {
  private syncQueue = inject(SyncQueueService);

  conflicts = signal<ConflictItem[]>([]);
  hasConflicts = signal(false);

  async loadConflicts(): Promise<void> {
    const failed = await this.syncQueue.getFailedItems();
    const items: ConflictItem[] = failed.map(item => ({
      id: item.id!,
      entity: item.entity,
      action: item.action,
      entityId: item.entityId,
      payload: JSON.parse(item.payload),
      errorMessage: item.errorMessage || 'Error desconocido',
      timestamp: item.timestamp,
      retries: item.retries,
    }));
    this.conflicts.set(items);
    this.hasConflicts.set(items.length > 0);
  }

  async resolveConflict(conflictId: number, resolution: ConflictResolution): Promise<void> {
    switch (resolution) {
      case 'retry':
        await offlineDb.syncQueue.update(conflictId, {
          status: 'pending',
          retries: 0,
          errorMessage: undefined,
        });
        break;

      case 'force':
        // Mark as pending with a force flag in the payload
        const item = await offlineDb.syncQueue.get(conflictId);
        if (item) {
          const payload = JSON.parse(item.payload);
          payload._forceOverwrite = true;
          await offlineDb.syncQueue.update(conflictId, {
            status: 'pending',
            retries: 0,
            payload: JSON.stringify(payload),
            errorMessage: undefined,
          });
        }
        break;

      case 'discard':
        await offlineDb.syncQueue.delete(conflictId);
        break;
    }

    await this.loadConflicts();
  }

  async resolveAll(resolution: ConflictResolution): Promise<void> {
    const current = this.conflicts();
    for (const conflict of current) {
      await this.resolveConflict(conflict.id, resolution);
    }
  }

  async retryAllFailed(): Promise<void> {
    await this.syncQueue.retryFailed();
    await this.loadConflicts();
  }

  async discardAllFailed(): Promise<void> {
    const failed = await this.syncQueue.getFailedItems();
    for (const item of failed) {
      await offlineDb.syncQueue.delete(item.id!);
    }
    await this.loadConflicts();
  }

  getEntityLabel(entity: string): string {
    const labels: Record<string, string> = {
      inventory: 'Inventario',
      movements: 'Movimientos',
      'movements/direct-entry': 'Entrada directa',
      'movements/exit': 'Salida',
      'movements/return': 'Devolución',
      'movements/transfer': 'Transferencia',
      invoices: 'Facturas',
      purchases: 'Compras',
      companies: 'Empresas',
      warehouses: 'Almacenes',
      accounts: 'Cuentas',
      employees: 'Empleados',
      'fixed-assets': 'Activos fijos',
      'stock-limits': 'Límites de stock',
    };
    return labels[entity] || entity;
  }

  getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      create: 'Crear',
      update: 'Actualizar',
      delete: 'Eliminar',
    };
    return labels[action] || action;
  }
}
