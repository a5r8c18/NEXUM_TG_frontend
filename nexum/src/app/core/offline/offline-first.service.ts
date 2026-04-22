import { Injectable, inject } from '@angular/core';
import { Observable, from, of, catchError, tap, firstValueFrom } from 'rxjs';
import { NetworkStatusService } from '../services/network-status.service';
import { OfflineDataService } from './offline-data.service';
import { SyncQueueService } from './sync-queue.service';
import { AuthService } from '../services/auth.service';
import { InventoryService } from '../services/inventory.service';
import { MovementsService } from '../services/movements.service';
import { InvoicesService } from '../services/invoices.service';
import { CompanyService } from '../services/company.service';
import { WarehouseService } from '../services/warehouse.service';
import { PurchasesService } from '../services/purchases.service';
import { offlineDb } from './offline-database';

/**
 * Servicio central offline-first.
 *
 * Patrón:
 *  - Online → API call → guardar en IndexedDB → retornar datos frescos
 *  - Offline → leer de IndexedDB → retornar datos cacheados
 *  - Escrituras offline → guardar en IndexedDB + encolar para sincronización
 */
@Injectable({ providedIn: 'root' })
export class OfflineFirstService {
  private network = inject(NetworkStatusService);
  private offlineData = inject(OfflineDataService);
  private syncQueue = inject(SyncQueueService);
  private auth = inject(AuthService);
  private inventoryService = inject(InventoryService);
  private movementsService = inject(MovementsService);
  private invoicesService = inject(InvoicesService);
  private companyService = inject(CompanyService);
  private warehouseService = inject(WarehouseService);
  private purchasesService = inject(PurchasesService);

  private get companyId(): number {
    return this.auth.getCurrentCompanyId();
  }

  // ═══════════════════════════════════════════════════════
  //  INVENTARIO
  // ═══════════════════════════════════════════════════════

  getInventory(filters?: any): Observable<any[]> {
    if (this.network.isOnline()) {
      return this.inventoryService.getInventory(filters, this.companyId).pipe(
        tap(items => this.cacheInventory(items)),
        catchError(() => from(this.offlineData.getInventoryOffline(this.companyId)))
      );
    }
    return from(this.offlineData.getInventoryOffline(this.companyId));
  }

  private async cacheInventory(items: any[]): Promise<void> {
    const now = new Date().toISOString();
    try {
      await offlineDb.transaction('rw', offlineDb.inventory, async () => {
        await offlineDb.inventory.where('companyId').equals(this.companyId).delete();
        for (const item of items) {
          await offlineDb.inventory.add({ ...item, companyId: this.companyId, lastSyncedAt: now });
        }
      });
    } catch { /* silently fail cache */ }
  }

  // ═══════════════════════════════════════════════════════
  //  MOVIMIENTOS
  // ═══════════════════════════════════════════════════════

  getMovements(filters?: any): Observable<any[]> {
    if (this.network.isOnline()) {
      return this.movementsService.getMovements(filters, this.companyId).pipe(
        tap(items => this.cacheMovements(items)),
        catchError(() => from(this.offlineData.getMovementsOffline(this.companyId)))
      );
    }
    return from(this.offlineData.getMovementsOffline(this.companyId));
  }

  registerDirectEntry(data: any): Observable<any> {
    if (this.network.isOnline()) {
      return this.movementsService.registerDirectEntry(data, this.companyId).pipe(
        catchError(() => from(this.createOfflineMovement(data, 'movements/direct-entry')))
      );
    }
    return from(this.createOfflineMovement(data, 'movements/direct-entry'));
  }

  registerExit(data: any): Observable<any> {
    if (this.network.isOnline()) {
      return this.movementsService.registerExit(data, this.companyId).pipe(
        catchError(() => from(this.createOfflineMovement(data, 'movements/exit')))
      );
    }
    return from(this.createOfflineMovement(data, 'movements/exit'));
  }

  createReturn(data: any): Observable<any> {
    if (this.network.isOnline()) {
      return this.movementsService.createReturn(data, this.companyId).pipe(
        catchError(() => from(this.createOfflineMovement(data, 'movements/return')))
      );
    }
    return from(this.createOfflineMovement(data, 'movements/return'));
  }

  createTransfer(data: any): Observable<any> {
    if (this.network.isOnline()) {
      return this.movementsService.createTransfer(data, this.companyId).pipe(
        catchError(() => from(this.createOfflineMovement(data, 'movements/transfer')))
      );
    }
    return from(this.createOfflineMovement(data, 'movements/transfer'));
  }

  private async createOfflineMovement(data: any, endpoint: string): Promise<any> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const movement = {
      ...data,
      id,
      companyId: this.companyId,
      date: now,
    };
    await offlineDb.movements.add(movement);
    await this.syncQueue.enqueue(endpoint, 'create', data, this.companyId);
    return movement;
  }

  private async cacheMovements(items: any[]): Promise<void> {
    const now = new Date().toISOString();
    try {
      await offlineDb.transaction('rw', offlineDb.movements, async () => {
        await offlineDb.movements.where('companyId').equals(this.companyId).delete();
        for (const item of items) {
          await offlineDb.movements.put({ ...item, companyId: this.companyId, lastSyncedAt: now });
        }
      });
    } catch { /* silently fail cache */ }
  }

  // ═══════════════════════════════════════════════════════
  //  FACTURAS
  // ═══════════════════════════════════════════════════════

  getInvoices(filters?: any): Observable<any[]> {
    if (this.network.isOnline()) {
      return this.invoicesService.getInvoices(filters).pipe(
        tap(items => this.cacheInvoices(items)),
        catchError(() => from(this.offlineData.getInvoicesOffline(this.companyId)))
      );
    }
    return from(this.offlineData.getInvoicesOffline(this.companyId));
  }

  getInvoiceById(id: string): Observable<any> {
    if (this.network.isOnline()) {
      return this.invoicesService.getInvoiceById(id).pipe(
        catchError(() => from(this.getInvoiceOfflineById(id)))
      );
    }
    return from(this.getInvoiceOfflineById(id));
  }

  createInvoice(data: any): Observable<any> {
    if (this.network.isOnline()) {
      return this.invoicesService.createInvoice(data).pipe(
        catchError(() => from(this.createInvoiceOffline(data)))
      );
    }
    return from(this.createInvoiceOffline(data));
  }

  updateInvoice(id: string, data: any): Observable<any> {
    if (this.network.isOnline()) {
      return this.invoicesService.updateInvoice(id, data).pipe(
        catchError(() => from(this.updateInvoiceOffline(id, data)))
      );
    }
    return from(this.updateInvoiceOffline(id, data));
  }

  deleteInvoice(id: string): Observable<any> {
    if (this.network.isOnline()) {
      return this.invoicesService.deleteInvoice(id).pipe(
        catchError(() => from(this.deleteInvoiceOffline(id)))
      );
    }
    return from(this.deleteInvoiceOffline(id));
  }

  private async getInvoiceOfflineById(id: string): Promise<any> {
    return offlineDb.invoices.get(id);
  }

  private async createInvoiceOffline(data: any): Promise<any> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const invoice = {
      ...data,
      id,
      companyId: this.companyId,
      issueDate: now,
      status: 'pending',
      items: data.items ?? [],
    };
    await offlineDb.invoices.add(invoice);
    await this.syncQueue.enqueue('invoices', 'create', data, this.companyId);
    return invoice;
  }

  private async updateInvoiceOffline(id: string, data: any): Promise<any> {
    await offlineDb.invoices.update(id, data);
    await this.syncQueue.enqueue('invoices', 'update', data, this.companyId, id);
    return { id, ...data };
  }

  private async deleteInvoiceOffline(id: string): Promise<void> {
    await offlineDb.invoices.delete(id);
    await this.syncQueue.enqueue('invoices', 'delete', {}, this.companyId, id);
  }

  private async cacheInvoices(items: any[]): Promise<void> {
    const now = new Date().toISOString();
    try {
      await offlineDb.transaction('rw', offlineDb.invoices, async () => {
        await offlineDb.invoices.where('companyId').equals(this.companyId).delete();
        for (const item of items) {
          await offlineDb.invoices.put({
            ...item,
            companyId: this.companyId,
            items: item.items ?? [],
            lastSyncedAt: now,
          });
        }
      });
    } catch { /* silently fail cache */ }
  }

  // ═══════════════════════════════════════════════════════
  //  EMPRESAS
  // ═══════════════════════════════════════════════════════

  getCompanies(): Observable<any[]> {
    if (this.network.isOnline()) {
      return this.companyService.getCompanies().pipe(
        tap(items => this.cacheCompanies(items)),
        catchError(() => from(this.offlineData.getCompaniesOffline()))
      );
    }
    return from(this.offlineData.getCompaniesOffline());
  }

  private async cacheCompanies(items: any[]): Promise<void> {
    const now = new Date().toISOString();
    try {
      await offlineDb.transaction('rw', offlineDb.companies, async () => {
        await offlineDb.companies.clear();
        for (const item of items) {
          await offlineDb.companies.put({ ...item, lastSyncedAt: now });
        }
      });
    } catch { /* silently fail cache */ }
  }

  // ═══════════════════════════════════════════════════════
  //  ALMACENES
  // ═══════════════════════════════════════════════════════

  getWarehouses(): Observable<any[]> {
    if (this.network.isOnline()) {
      return this.warehouseService.getWarehouses().pipe(
        tap(items => this.cacheWarehouses(items)),
        catchError(() => from(this.offlineData.getWarehousesOffline(this.companyId)))
      );
    }
    return from(this.offlineData.getWarehousesOffline(this.companyId));
  }

  private async cacheWarehouses(items: any[]): Promise<void> {
    const now = new Date().toISOString();
    try {
      await offlineDb.transaction('rw', offlineDb.warehouses, async () => {
        await offlineDb.warehouses.where('companyId').equals(this.companyId).delete();
        for (const item of items) {
          await offlineDb.warehouses.put({ ...item, companyId: this.companyId, lastSyncedAt: now });
        }
      });
    } catch { /* silently fail cache */ }
  }

  // ═══════════════════════════════════════════════════════
  //  CUENTAS CONTABLES
  // ═══════════════════════════════════════════════════════

  getAccounts(): Observable<any[]> {
    if (this.network.isOnline()) {
      return new Observable<any[]>(subscriber => {
        this.offlineData.syncAccounts(this.companyId).then(() => {
          from(this.offlineData.getAccountsOffline(this.companyId)).subscribe(subscriber);
        }).catch(() => {
          from(this.offlineData.getAccountsOffline(this.companyId)).subscribe(subscriber);
        });
      });
    }
    return from(this.offlineData.getAccountsOffline(this.companyId));
  }

  // ═══════════════════════════════════════════════════════
  //  ASIENTOS CONTABLES
  // ═══════════════════════════════════════════════════════

  // JournalEntries functionality removed

  // ═══════════════════════════════════════════════════════
  //  EMPLEADOS
  // ═══════════════════════════════════════════════════════

  getEmployees(): Observable<any[]> {
    if (this.network.isOnline()) {
      return new Observable<any[]>(subscriber => {
        this.offlineData.syncEmployees(this.companyId).then(() => {
          from(this.offlineData.getEmployeesOffline(this.companyId)).subscribe(subscriber);
        }).catch(() => {
          from(this.offlineData.getEmployeesOffline(this.companyId)).subscribe(subscriber);
        });
      });
    }
    return from(this.offlineData.getEmployeesOffline(this.companyId));
  }

  // ═══════════════════════════════════════════════════════
  //  ACTIVOS FIJOS
  // ═══════════════════════════════════════════════════════

  getFixedAssets(): Observable<any[]> {
    if (this.network.isOnline()) {
      return new Observable<any[]>(subscriber => {
        this.offlineData.syncFixedAssets(this.companyId).then(() => {
          from(this.offlineData.getFixedAssetsOffline(this.companyId)).subscribe(subscriber);
        }).catch(() => {
          from(this.offlineData.getFixedAssetsOffline(this.companyId)).subscribe(subscriber);
        });
      });
    }
    return from(this.offlineData.getFixedAssetsOffline(this.companyId));
  }

  // ═══════════════════════════════════════════════════════
  //  LIMITES DE STOCK
  // ═══════════════════════════════════════════════════════

  getStockLimits(): Observable<any[]> {
    if (this.network.isOnline()) {
      return new Observable<any[]>(subscriber => {
        this.offlineData.syncStockLimits(this.companyId).then(() => {
          from(this.offlineData.getStockLimitsOffline(this.companyId)).subscribe(subscriber);
        }).catch(() => {
          from(this.offlineData.getStockLimitsOffline(this.companyId)).subscribe(subscriber);
        });
      });
    }
    return from(this.offlineData.getStockLimitsOffline(this.companyId));
  }

  // ═══════════════════════════════════════════════════════
  //  COMPRAS
  // ═══════════════════════════════════════════════════════

  createPurchase(data: any): Observable<any> {
    if (this.network.isOnline()) {
      return this.purchasesService.createPurchase(data, this.companyId).pipe(
        catchError(() => from(this.createPurchaseOffline(data)))
      );
    }
    return from(this.createPurchaseOffline(data));
  }

  private async createPurchaseOffline(data: any): Promise<any> {
    await this.syncQueue.enqueue('purchases', 'create', { ...data, companyId: this.companyId }, this.companyId);
    return { ...data, id: crypto.randomUUID(), _offline: true };
  }

  // ═══════════════════════════════════════════════════════
  //  SYNC STATUS
  // ═══════════════════════════════════════════════════════

  async getLastSyncTime(entity: string): Promise<string | null> {
    return this.offlineData.getLastSyncTime(entity, this.companyId);
  }

  async getSyncStatus(): Promise<any[]> {
    return this.offlineData.getSyncStatus();
  }

  async forceSyncAll(): Promise<void> {
    if (!this.network.isOnline()) return;
    await this.syncQueue.processQueue();
    await this.offlineData.syncAllForCompany(this.companyId);
  }
}
