import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { offlineDb, SyncMetadata } from './offline-database';
import { NetworkStatusService } from '../services/network-status.service';
import { SyncQueueService } from './sync-queue.service';

@Injectable({ providedIn: 'root' })
export class OfflineDataService {
  private http = inject(HttpClient);
  private networkStatus = inject(NetworkStatusService);
  private syncQueue = inject(SyncQueueService);
  private apiUrl = environment.apiUrl;

  // ─── Sincronización de datos del servidor → IndexedDB ───

  async syncAllForCompany(companyId: number): Promise<void> {
    if (!this.networkStatus.isOnline()) return;

    this.networkStatus.setSyncing(true);
    try {
      await Promise.allSettled([
        this.syncInventory(companyId),
        this.syncWarehouses(companyId),
        this.syncInvoices(companyId),
        this.syncAccounts(companyId),
                this.syncEmployees(companyId),
        this.syncFixedAssets(companyId),
        this.syncStockLimits(companyId),
        this.syncMovements(companyId),
      ]);
    } finally {
      this.networkStatus.setSyncing(false);
    }
  }

  // ─── Inventario ───

  async syncInventory(companyId: number): Promise<void> {
    try {
      const params = new HttpParams().set('companyId', companyId.toString());
      const response = await firstValueFrom(
        this.http.get<{ inventory: any[] }>(`${this.apiUrl}/inventory`, { params })
      );
      const items = response.inventory ?? [];
      const now = new Date().toISOString();

      await offlineDb.transaction('rw', offlineDb.inventory, async () => {
        await offlineDb.inventory.where('companyId').equals(companyId).delete();
        for (const item of items) {
          await offlineDb.inventory.add({ ...item, companyId, lastSyncedAt: now });
        }
      });

      await this.updateSyncMeta('inventory', companyId, items.length);
    } catch (error) {
      console.warn('Sync inventory failed:', error);
    }
  }

  async getInventoryOffline(companyId: number): Promise<any[]> {
    return offlineDb.inventory.where('companyId').equals(companyId).toArray();
  }

  // ─── Movimientos ───

  async syncMovements(companyId: number): Promise<void> {
    try {
      const params = new HttpParams()
        .set('companyId', companyId.toString())
        .set('relations', 'true');
      const items = await firstValueFrom(
        this.http.get<any[]>(`${this.apiUrl}/movements`, { params })
      );
      const now = new Date().toISOString();

      await offlineDb.transaction('rw', offlineDb.movements, async () => {
        await offlineDb.movements.where('companyId').equals(companyId).delete();
        for (const item of items) {
          await offlineDb.movements.put({ ...item, companyId, lastSyncedAt: now });
        }
      });

      await this.updateSyncMeta('movements', companyId, items.length);
    } catch (error) {
      console.warn('Sync movements failed:', error);
    }
  }

  async getMovementsOffline(companyId: number): Promise<any[]> {
    return offlineDb.movements.where('companyId').equals(companyId).toArray();
  }

  async createMovementOffline(data: any, companyId: number): Promise<void> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await offlineDb.movements.add({
      ...data,
      id,
      companyId,
      date: now,
      lastSyncedAt: undefined,
    });
    await this.syncQueue.enqueue('movements/direct-entry', 'create', data, companyId);
  }

  // ─── Facturas ───

  async syncInvoices(companyId: number): Promise<void> {
    try {
      const params = new HttpParams().set('companyId', companyId.toString());
      const response = await firstValueFrom(
        this.http.get<any>(`${this.apiUrl}/invoices`, { params })
      );
      const items = response.data ?? response ?? [];
      const now = new Date().toISOString();

      await offlineDb.transaction('rw', offlineDb.invoices, async () => {
        await offlineDb.invoices.where('companyId').equals(companyId).delete();
        for (const item of items) {
          await offlineDb.invoices.put({
            ...item,
            companyId,
            items: item.items ?? [],
            lastSyncedAt: now,
          });
        }
      });

      await this.updateSyncMeta('invoices', companyId, items.length);
    } catch (error) {
      console.warn('Sync invoices failed:', error);
    }
  }

  async getInvoicesOffline(companyId: number): Promise<any[]> {
    return offlineDb.invoices.where('companyId').equals(companyId).toArray();
  }

  async createInvoiceOffline(data: any, companyId: number): Promise<void> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await offlineDb.invoices.add({
      ...data,
      id,
      companyId,
      issueDate: now,
      status: 'pending',
      items: data.items ?? [],
      lastSyncedAt: undefined,
    });
    await this.syncQueue.enqueue('invoices', 'create', data, companyId);
  }

  // ─── Almacenes ───

  async syncWarehouses(companyId: number): Promise<void> {
    try {
      const params = new HttpParams().set('companyId', companyId.toString());
      const items = await firstValueFrom(
        this.http.get<any[]>(`${this.apiUrl}/warehouses`, { params })
      );
      const now = new Date().toISOString();

      await offlineDb.transaction('rw', offlineDb.warehouses, async () => {
        await offlineDb.warehouses.where('companyId').equals(companyId).delete();
        for (const item of items) {
          await offlineDb.warehouses.put({ ...item, companyId, lastSyncedAt: now });
        }
      });

      await this.updateSyncMeta('warehouses', companyId, items.length);
    } catch (error) {
      console.warn('Sync warehouses failed:', error);
    }
  }

  async getWarehousesOffline(companyId: number): Promise<any[]> {
    return offlineDb.warehouses.where('companyId').equals(companyId).toArray();
  }

  // ─── Cuentas contables ───

  async syncAccounts(companyId: number): Promise<void> {
    try {
      const params = new HttpParams().set('companyId', companyId.toString());
      const items = await firstValueFrom(
        this.http.get<any[]>(`${this.apiUrl}/accounting/accounts`, { params })
      );
      const now = new Date().toISOString();

      await offlineDb.transaction('rw', offlineDb.accounts, async () => {
        await offlineDb.accounts.where('companyId').equals(companyId).delete();
        for (const item of items) {
          await offlineDb.accounts.put({ ...item, companyId, lastSyncedAt: now });
        }
      });

      await this.updateSyncMeta('accounts', companyId, items.length);
    } catch (error) {
      console.warn('Sync accounts failed:', error);
    }
  }

  async getAccountsOffline(companyId: number): Promise<any[]> {
    return offlineDb.accounts.where('companyId').equals(companyId).toArray();
  }

  // ─── Asientos contables ───

  async syncJournalEntries(companyId: number): Promise<void> {
    try {
      const params = new HttpParams().set('companyId', companyId.toString());
      const items = await firstValueFrom(
        this.http.get<any[]>(`${this.apiUrl}/accounting`, { params })
      );
      const now = new Date().toISOString();

      // JournalEntries functionality removed

      await this.updateSyncMeta('journalEntries', companyId, items.length);
    } catch (error) {
      console.warn('Sync journal entries failed:', error);
    }
  }

  
  // ─── Empleados ───

  async syncEmployees(companyId: number): Promise<void> {
    try {
      const params = new HttpParams().set('companyId', companyId.toString());
      const items = await firstValueFrom(
        this.http.get<any[]>(`${this.apiUrl}/hr/employees`, { params })
      );
      const now = new Date().toISOString();

      await offlineDb.transaction('rw', offlineDb.employees, async () => {
        await offlineDb.employees.where('companyId').equals(companyId).delete();
        for (const item of items) {
          await offlineDb.employees.put({ ...item, companyId, lastSyncedAt: now });
        }
      });

      await this.updateSyncMeta('employees', companyId, items.length);
    } catch (error) {
      console.warn('Sync employees failed:', error);
    }
  }

  async getEmployeesOffline(companyId: number): Promise<any[]> {
    return offlineDb.employees.where('companyId').equals(companyId).toArray();
  }

  // ─── Activos fijos ───

  async syncFixedAssets(companyId: number): Promise<void> {
    try {
      const params = new HttpParams().set('companyId', companyId.toString());
      const items = await firstValueFrom(
        this.http.get<any[]>(`${this.apiUrl}/fixed-assets`, { params })
      );
      const now = new Date().toISOString();

      await offlineDb.transaction('rw', offlineDb.fixedAssets, async () => {
        await offlineDb.fixedAssets.where('companyId').equals(companyId).delete();
        for (const item of items) {
          await offlineDb.fixedAssets.add({ ...item, companyId, lastSyncedAt: now });
        }
      });

      await this.updateSyncMeta('fixedAssets', companyId, items.length);
    } catch (error) {
      console.warn('Sync fixed assets failed:', error);
    }
  }

  async getFixedAssetsOffline(companyId: number): Promise<any[]> {
    return offlineDb.fixedAssets.where('companyId').equals(companyId).toArray();
  }

  // ─── Límites de stock ───

  async syncStockLimits(companyId: number): Promise<void> {
    try {
      const params = new HttpParams().set('companyId', companyId.toString());
      const items = await firstValueFrom(
        this.http.get<any[]>(`${this.apiUrl}/stock-limits`, { params })
      );
      const now = new Date().toISOString();

      await offlineDb.transaction('rw', offlineDb.stockLimits, async () => {
        await offlineDb.stockLimits.where('companyId').equals(companyId).delete();
        for (const item of items) {
          await offlineDb.stockLimits.put({ ...item, companyId, lastSyncedAt: now });
        }
      });

      await this.updateSyncMeta('stockLimits', companyId, items.length);
    } catch (error) {
      console.warn('Sync stock limits failed:', error);
    }
  }

  async getStockLimitsOffline(companyId: number): Promise<any[]> {
    return offlineDb.stockLimits.where('companyId').equals(companyId).toArray();
  }

  // ─── Empresas ───

  async syncCompanies(tenantId?: string): Promise<void> {
    try {
      const items = await firstValueFrom(
        this.http.get<any[]>(`${this.apiUrl}/companies`)
      );
      const now = new Date().toISOString();

      await offlineDb.transaction('rw', offlineDb.companies, async () => {
        await offlineDb.companies.clear();
        for (const item of items) {
          await offlineDb.companies.put({ ...item, lastSyncedAt: now });
        }
      });
    } catch (error) {
      console.warn('Sync companies failed:', error);
    }
  }

  async getCompaniesOffline(): Promise<any[]> {
    return offlineDb.companies.toArray();
  }

  // ─── Metadata de sincronización ───

  private async updateSyncMeta(entity: string, companyId: number, count: number): Promise<void> {
    const existing = await offlineDb.syncMetadata
      .where('[entity+companyId]')
      .equals([entity, companyId])
      .first();

    const meta: SyncMetadata = {
      entity,
      companyId,
      lastSyncedAt: new Date().toISOString(),
      recordCount: count,
    };

    if (existing) {
      await offlineDb.syncMetadata.update(existing.id!, meta);
    } else {
      await offlineDb.syncMetadata.add(meta);
    }
  }

  async getLastSyncTime(entity: string, companyId: number): Promise<string | null> {
    const meta = await offlineDb.syncMetadata
      .where('[entity+companyId]')
      .equals([entity, companyId])
      .first();
    return meta?.lastSyncedAt ?? null;
  }

  async getSyncStatus(): Promise<SyncMetadata[]> {
    return offlineDb.syncMetadata.toArray();
  }

  // ─── Limpieza ───

  async clearAllOfflineData(): Promise<void> {
    await offlineDb.transaction(
      'rw',
      [
        offlineDb.inventory,
        offlineDb.movements,
        offlineDb.invoices,
        offlineDb.warehouses,
        offlineDb.companies,
        offlineDb.accounts,
                offlineDb.employees,
        offlineDb.fixedAssets,
        offlineDb.stockLimits,
        offlineDb.syncMetadata,
      ],
      async () => {
        await offlineDb.inventory.clear();
        await offlineDb.movements.clear();
        await offlineDb.invoices.clear();
        await offlineDb.warehouses.clear();
        await offlineDb.companies.clear();
        await offlineDb.accounts.clear();
                await offlineDb.employees.clear();
        await offlineDb.fixedAssets.clear();
        await offlineDb.stockLimits.clear();
        await offlineDb.syncMetadata.clear();
      }
    );
  }
}
