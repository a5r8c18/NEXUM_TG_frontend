import { Component, inject, computed } from '@angular/core';
import { NetworkStatusService } from '../../../core/services/network-status.service';

@Component({
  selector: 'app-network-status',
  standalone: true,
  template: `
    @if (showBanner()) {
      <div [class]="bannerClass()" class="fixed bottom-0 left-0 right-0 z-[9998] transition-all duration-300 ease-in-out">
        <div class="flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium">
          <!-- Dot indicator -->
          <span [class]="dotClass()" class="relative flex h-2.5 w-2.5">
            @if (networkService.networkState() === 'syncing') {
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            }
            <span [class]="dotInnerClass()" class="relative inline-flex rounded-full h-2.5 w-2.5"></span>
          </span>

          <!-- Message -->
          <span>{{ message() }}</span>

          <!-- Pending count -->
          @if (networkService.hasPendingChanges()) {
            <span class="bg-white/20 px-2 py-0.5 rounded-full text-xs">
              {{ networkService.pendingOperations() }} pendiente{{ networkService.pendingOperations() > 1 ? 's' : '' }}
            </span>
          }
        </div>
      </div>
    }
  `
})
export class NetworkStatusComponent {
  networkService = inject(NetworkStatusService);

  showBanner = computed(() => {
    return this.networkService.networkState() !== 'online';
  });

  message = computed(() => {
    switch (this.networkService.networkState()) {
      case 'offline':
        return 'Sin conexión — Trabajando en modo offline';
      case 'syncing':
        return 'Sincronizando cambios...';
      default:
        return '';
    }
  });

  bannerClass = computed(() => {
    switch (this.networkService.networkState()) {
      case 'offline':
        return 'bg-slate-800 text-white';
      case 'syncing':
        return 'bg-amber-500 text-white';
      default:
        return '';
    }
  });

  dotClass = computed(() => 'flex-shrink-0');

  dotInnerClass = computed(() => {
    switch (this.networkService.networkState()) {
      case 'offline':
        return 'bg-red-500';
      case 'syncing':
        return 'bg-amber-300';
      default:
        return 'bg-emerald-500';
    }
  });
}
