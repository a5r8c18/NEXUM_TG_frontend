import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { offlineDb, SyncQueueItem } from './offline-database';
import { NetworkStatusService } from '../services/network-status.service';

@Injectable({ providedIn: 'root' })
export class SyncQueueService {
  private http = inject(HttpClient);
  private networkStatus = inject(NetworkStatusService);
  private apiUrl = environment.apiUrl;
  private isSyncing = false;

  async enqueue(
    entity: string,
    action: 'create' | 'update' | 'delete',
    payload: any,
    companyId: number,
    entityId?: string
  ): Promise<void> {
    const item: SyncQueueItem = {
      entity,
      action,
      entityId,
      payload: JSON.stringify(payload),
      timestamp: new Date().toISOString(),
      retries: 0,
      status: 'pending',
      companyId,
    };

    await offlineDb.syncQueue.add(item);
    this.networkStatus.incrementPending();

    // Try to sync immediately if online
    if (this.networkStatus.isOnline()) {
      this.processQueue();
    }
  }

  async processQueue(): Promise<void> {
    if (this.isSyncing || !this.networkStatus.isOnline()) return;

    this.isSyncing = true;
    this.networkStatus.setSyncing(true);

    try {
      const pendingItems = await offlineDb.syncQueue
        .where('status')
        .anyOf(['pending', 'failed'])
        .sortBy('timestamp');

      for (const item of pendingItems) {
        if (!this.networkStatus.isOnline()) break;

        try {
          await offlineDb.syncQueue.update(item.id!, { status: 'syncing' });
          await this.syncItem(item);
          await offlineDb.syncQueue.update(item.id!, { status: 'completed' });
          this.networkStatus.decrementPending();
        } catch (error: any) {
          const retries = item.retries + 1;
          const status = retries >= 3 ? 'failed' : 'pending';
          await offlineDb.syncQueue.update(item.id!, {
            status,
            retries,
            errorMessage: error?.message || 'Error de sincronización',
          });

          if (retries >= 3) {
            console.error(`Sync failed after 3 retries for ${item.entity}/${item.action}:`, error);
          }
        }
      }

      // Clean up completed items older than 24h
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await offlineDb.syncQueue
        .where('status')
        .equals('completed')
        .filter(i => i.timestamp < cutoff)
        .delete();

    } finally {
      this.isSyncing = false;
      this.networkStatus.setSyncing(false);

      // Update pending count
      const pending = await offlineDb.syncQueue
        .where('status')
        .anyOf(['pending', 'failed'])
        .count();
      this.networkStatus.setPendingOperations(pending);
    }
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    const payload = JSON.parse(item.payload);
    const baseUrl = `${this.apiUrl}/${item.entity}`;

    switch (item.action) {
      case 'create':
        await firstValueFrom(this.http.post(baseUrl, payload));
        break;
      case 'update':
        await firstValueFrom(this.http.put(`${baseUrl}/${item.entityId}`, payload));
        break;
      case 'delete':
        await firstValueFrom(this.http.delete(`${baseUrl}/${item.entityId}`));
        break;
    }
  }

  async getPendingCount(): Promise<number> {
    return offlineDb.syncQueue
      .where('status')
      .anyOf(['pending', 'failed'])
      .count();
  }

  async getFailedItems(): Promise<SyncQueueItem[]> {
    return offlineDb.syncQueue
      .where('status')
      .equals('failed')
      .toArray();
  }

  async retryFailed(): Promise<void> {
    await offlineDb.syncQueue
      .where('status')
      .equals('failed')
      .modify({ status: 'pending', retries: 0 });

    this.processQueue();
  }

  async clearCompleted(): Promise<void> {
    await offlineDb.syncQueue
      .where('status')
      .equals('completed')
      .delete();
  }
}
