import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NetworkStatusService } from '../../../core/services/network-status.service';
import { ConflictResolverService, ConflictItem, ConflictResolution } from '../../../core/offline/conflict-resolver.service';
import { OfflineFirstService } from '../../../core/offline/offline-first.service';
import { SyncQueueService } from '../../../core/offline/sync-queue.service';

@Component({
  selector: 'app-sync-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Sync Panel Toggle Button -->
    <button
      (click)="togglePanel()"
      class="fixed bottom-16 right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-full shadow-lg text-xs font-medium transition-all"
      [class]="buttonClass"
    >
      @if (networkStatus.isSyncing()) {
        <span class="animate-spin">&#x21bb;</span>
      } @else if (!networkStatus.isOnline()) {
        <span>&#x26A0;</span>
      } @else if (conflictResolver.hasConflicts()) {
        <span>&#x26A0;</span>
      } @else {
        <span>&#x2713;</span>
      }
      <span>{{ statusText }}</span>
      @if (networkStatus.pendingOperations() > 0) {
        <span class="bg-white/30 px-1.5 py-0.5 rounded-full text-[10px]">
          {{ networkStatus.pendingOperations() }}
        </span>
      }
    </button>

    <!-- Sync Panel -->
    @if (isOpen()) {
      <div class="fixed bottom-28 right-4 z-50 w-96 max-h-[70vh] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        <!-- Header -->
        <div class="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-slate-800">Estado de sincronización</h3>
          <button (click)="togglePanel()" class="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
        </div>

        <div class="overflow-y-auto max-h-[calc(70vh-52px)]">
          <!-- Network Status -->
          <div class="px-4 py-3 border-b border-slate-100">
            <div class="flex items-center gap-2">
              <div [class]="networkStatus.isOnline() ? 'bg-green-400' : 'bg-red-400'" class="w-2.5 h-2.5 rounded-full"></div>
              <span class="text-sm text-slate-700">{{ networkStatus.isOnline() ? 'Conectado' : 'Sin conexión' }}</span>
            </div>
            <div class="mt-1 text-xs text-slate-500">
              {{ networkStatus.pendingOperations() }} operaciones pendientes
            </div>
          </div>

          <!-- Actions -->
          <div class="px-4 py-3 border-b border-slate-100 flex gap-2">
            <button
              (click)="forceSyncAll()"
              [disabled]="!networkStatus.isOnline() || isSyncing()"
              class="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
              [class]="networkStatus.isOnline() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'"
            >
              Sincronizar todo
            </button>
            @if (conflictResolver.hasConflicts()) {
              <button
                (click)="retryAllConflicts()"
                class="flex-1 px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                Reintentar fallidos
              </button>
            }
          </div>

          <!-- Conflicts -->
          @if (conflictResolver.conflicts().length > 0) {
            <div class="px-4 py-2">
              <h4 class="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">
                Conflictos ({{ conflictResolver.conflicts().length }})
              </h4>
              @for (conflict of conflictResolver.conflicts(); track conflict.id) {
                <div class="mb-2 p-3 bg-red-50 rounded-lg border border-red-100">
                  <div class="flex items-start justify-between">
                    <div>
                      <span class="text-xs font-medium text-red-800">
                        {{ conflictResolver.getEntityLabel(conflict.entity) }}
                        — {{ conflictResolver.getActionLabel(conflict.action) }}
                      </span>
                      <p class="text-[11px] text-red-600 mt-0.5">{{ conflict.errorMessage }}</p>
                      <p class="text-[10px] text-slate-400 mt-0.5">
                        {{ formatDate(conflict.timestamp) }} · {{ conflict.retries }} reintentos
                      </p>
                    </div>
                  </div>
                  <div class="flex gap-1.5 mt-2">
                    <button
                      (click)="resolve(conflict.id, 'retry')"
                      class="px-2 py-1 text-[10px] font-medium bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Reintentar
                    </button>
                    <button
                      (click)="resolve(conflict.id, 'force')"
                      class="px-2 py-1 text-[10px] font-medium bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
                    >
                      Forzar
                    </button>
                    <button
                      (click)="resolve(conflict.id, 'discard')"
                      class="px-2 py-1 text-[10px] font-medium bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Descartar
                    </button>
                  </div>
                </div>
              }
              <button
                (click)="discardAllConflicts()"
                class="w-full mt-1 px-3 py-1.5 text-[10px] font-medium text-red-600 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
              >
                Descartar todos los conflictos
              </button>
            </div>
          } @else {
            <div class="px-4 py-6 text-center text-sm text-slate-400">
              Sin conflictos de sincronización
            </div>
          }
        </div>
      </div>
    }
  `
})
export class SyncStatusComponent implements OnInit {
  networkStatus = inject(NetworkStatusService);
  conflictResolver = inject(ConflictResolverService);
  private offlineFirst = inject(OfflineFirstService);
  private syncQueue = inject(SyncQueueService);

  isOpen = signal(false);
  isSyncing = signal(false);

  get statusText(): string {
    if (this.networkStatus.isSyncing()) return 'Sincronizando...';
    if (!this.networkStatus.isOnline()) return 'Offline';
    if (this.conflictResolver.hasConflicts()) return 'Conflictos';
    if (this.networkStatus.pendingOperations() > 0) return 'Pendientes';
    return 'Sincronizado';
  }

  get buttonClass(): string {
    if (this.networkStatus.isSyncing()) return 'bg-blue-600 text-white';
    if (!this.networkStatus.isOnline()) return 'bg-slate-600 text-white';
    if (this.conflictResolver.hasConflicts()) return 'bg-red-600 text-white';
    if (this.networkStatus.pendingOperations() > 0) return 'bg-amber-600 text-white';
    return 'bg-green-600 text-white';
  }

  ngOnInit(): void {
    this.conflictResolver.loadConflicts();
    // Refresh conflicts periodically
    setInterval(() => this.conflictResolver.loadConflicts(), 30000);
  }

  togglePanel(): void {
    this.isOpen.update(v => !v);
    if (this.isOpen()) {
      this.conflictResolver.loadConflicts();
    }
  }

  async forceSyncAll(): Promise<void> {
    this.isSyncing.set(true);
    try {
      await this.offlineFirst.forceSyncAll();
      await this.conflictResolver.loadConflicts();
    } finally {
      this.isSyncing.set(false);
    }
  }

  async retryAllConflicts(): Promise<void> {
    await this.conflictResolver.retryAllFailed();
  }

  async discardAllConflicts(): Promise<void> {
    await this.conflictResolver.discardAllFailed();
  }

  resolve(id: number, resolution: ConflictResolution): void {
    this.conflictResolver.resolveConflict(id, resolution);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  }
}
