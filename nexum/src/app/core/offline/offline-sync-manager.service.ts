import { Injectable, inject, OnDestroy } from '@angular/core';
import { NetworkStatusService } from '../services/network-status.service';
import { OfflineDataService } from './offline-data.service';
import { SyncQueueService } from './sync-queue.service';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class OfflineSyncManagerService implements OnDestroy {
  private networkStatus = inject(NetworkStatusService);
  private offlineData = inject(OfflineDataService);
  private syncQueue = inject(SyncQueueService);
  private authService = inject(AuthService);
  private onlineHandler: (() => void) | null = null;
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  initialize(): void {
    // Sync when coming back online
    this.onlineHandler = () => {
      console.log('🔄 Red restablecida — iniciando sincronización...');
      this.fullSync();
    };
    window.addEventListener('online', this.onlineHandler);

    // Periodic sync every 5 minutes if online
    this.syncInterval = setInterval(() => {
      if (this.networkStatus.isOnline()) {
        this.fullSync();
      }
    }, 5 * 60 * 1000);

    // Initial sync
    if (this.networkStatus.isOnline()) {
      setTimeout(() => this.fullSync(), 2000);
    }

    // Restore pending count from DB
    this.restorePendingCount();
  }

  async fullSync(): Promise<void> {
    const companyId = this.authService.getCurrentCompanyId();
    if (!companyId || !this.networkStatus.isOnline()) return;

    try {
      // First: push pending changes to server
      await this.syncQueue.processQueue();

      // Then: pull latest data from server
      await this.offlineData.syncAllForCompany(companyId);
      await this.offlineData.syncCompanies();

      console.log('✅ Sincronización completa');
    } catch (error) {
      console.warn('⚠️ Sincronización parcial:', error);
    }
  }

  async syncEntity(entity: string): Promise<void> {
    const companyId = this.authService.getCurrentCompanyId();
    if (!companyId || !this.networkStatus.isOnline()) return;

    switch (entity) {
      case 'inventory':
        await this.offlineData.syncInventory(companyId);
        break;
      case 'movements':
        await this.offlineData.syncMovements(companyId);
        break;
      case 'invoices':
        await this.offlineData.syncInvoices(companyId);
        break;
      case 'warehouses':
        await this.offlineData.syncWarehouses(companyId);
        break;
      case 'accounts':
        await this.offlineData.syncAccounts(companyId);
        break;
      case 'journalEntries':
        await this.offlineData.syncJournalEntries(companyId);
        break;
      case 'employees':
        await this.offlineData.syncEmployees(companyId);
        break;
      case 'fixedAssets':
        await this.offlineData.syncFixedAssets(companyId);
        break;
      case 'stockLimits':
        await this.offlineData.syncStockLimits(companyId);
        break;
    }
  }

  private async restorePendingCount(): Promise<void> {
    const count = await this.syncQueue.getPendingCount();
    this.networkStatus.setPendingOperations(count);
  }

  ngOnDestroy(): void {
    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler);
    }
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}
