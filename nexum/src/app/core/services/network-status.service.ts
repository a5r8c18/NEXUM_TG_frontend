import { Injectable, signal, computed, OnDestroy } from '@angular/core';

export type NetworkState = 'online' | 'offline' | 'syncing';

@Injectable({ providedIn: 'root' })
export class NetworkStatusService implements OnDestroy {
  private onlineSignal = signal(navigator.onLine);
  private syncingSignal = signal(false);
  private pendingOperationsSignal = signal(0);

  isOnline = this.onlineSignal.asReadonly();
  isSyncing = this.syncingSignal.asReadonly();
  pendingOperations = this.pendingOperationsSignal.asReadonly();

  networkState = computed<NetworkState>(() => {
    if (this.syncingSignal()) return 'syncing';
    return this.onlineSignal() ? 'online' : 'offline';
  });

  hasPendingChanges = computed(() => this.pendingOperationsSignal() > 0);

  private onlineHandler = () => {
    this.onlineSignal.set(true);
    console.log('🟢 Red: Conexión restablecida');
  };

  private offlineHandler = () => {
    this.onlineSignal.set(false);
    console.log('🔴 Red: Sin conexión');
  };

  constructor() {
    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
  }

  setSyncing(value: boolean): void {
    this.syncingSignal.set(value);
  }

  setPendingOperations(count: number): void {
    this.pendingOperationsSignal.set(count);
  }

  incrementPending(): void {
    this.pendingOperationsSignal.update(c => c + 1);
  }

  decrementPending(): void {
    this.pendingOperationsSignal.update(c => Math.max(0, c - 1));
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.onlineHandler);
    window.removeEventListener('offline', this.offlineHandler);
  }
}
