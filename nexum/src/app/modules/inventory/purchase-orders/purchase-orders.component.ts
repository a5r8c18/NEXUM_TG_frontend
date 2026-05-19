import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PurchaseOrdersService } from '../../../core/services/purchase-orders.service';

@Component({
  selector: 'app-purchase-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold dark:text-white">Órdenes de Compra</h1>
        <button (click)="showCreate.set(true)" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">+ Nueva Orden</button>
      </div>

      <div class="flex gap-3 mb-4">
        <select [(ngModel)]="statusFilter" (ngModelChange)="loadData()" class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:text-white text-sm">
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="submitted">Enviada</option>
          <option value="approved">Aprobada</option>
          <option value="rejected">Rechazada</option>
          <option value="sent">Enviada al proveedor</option>
          <option value="partially_received">Recibida parcial</option>
          <option value="completed">Completada</option>
          <option value="cancelled">Cancelada</option>
        </select>
        <input type="text" [(ngModel)]="supplierFilter" (ngModelChange)="loadData()" placeholder="Buscar proveedor..." class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:text-white text-sm flex-1" />
      </div>

      @if (isLoading()) {
        <div class="flex justify-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      } @else {
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Número</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Fecha</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Proveedor</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Almacén</th>
                <th class="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Total</th>
                <th class="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Estado</th>
                <th class="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (po of items(); track po.id) {
                <tr class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td class="px-4 py-3 dark:text-slate-300 font-mono text-xs">{{ po.orderNumber }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ po.orderDate }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">
                    <div class="font-medium">{{ po.supplierName }}</div>
                    <div class="text-xs text-slate-500 dark:text-slate-400">{{ po.requesterName }}</div>
                  </td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ po.warehouseName }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ po.totalAmount | number:'1.2-2' }} {{ po.currency }}</td>
                  <td class="px-4 py-3 text-center">
                    <span [class]="getStatusClass(po.status)" class="px-2 py-1 rounded-full text-xs font-medium">{{ getStatusLabel(po.status) }}</span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    @if (po.status === 'draft') {
                      <button (click)="submit(po.id)" class="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors mr-1">Enviar</button>
                    }
                    @if (po.status === 'submitted') {
                      <button (click)="approve(po.id)" class="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition-colors mr-1">Aprobar</button>
                      <button (click)="reject(po.id)" class="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition-colors mr-1">Rechazar</button>
                    }
                    @if (['draft', 'submitted', 'approved'].includes(po.status)) {
                      <button (click)="cancel(po.id)" class="bg-slate-600 text-white px-3 py-1 rounded text-xs hover:bg-slate-700 transition-colors">Cancelar</button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No hay órdenes de compra</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `
})
export class PurchaseOrdersComponent implements OnInit {
  private poService = inject(PurchaseOrdersService);
  items = signal<any[]>([]);
  isLoading = signal(false);
  showCreate = signal(false);
  statusFilter = '';
  supplierFilter = '';

  ngOnInit() { this.loadData(); }

  loadData() {
    this.isLoading.set(true);
    this.poService.getAll({
      status: this.statusFilter || undefined,
      supplierName: this.supplierFilter || undefined,
    }).subscribe({
      next: (data) => { this.items.set(data); this.isLoading.set(false); },
      error: () => this.isLoading.set(false),
    });
  }

  submit(id: string) {
    this.poService.submit(id).subscribe(() => this.loadData());
  }

  approve(id: string) {
    this.poService.approve(id).subscribe(() => this.loadData());
  }

  reject(id: string) {
    const reason = prompt('Motivo del rechazo:');
    if (reason) {
      this.poService.reject(id, reason).subscribe(() => this.loadData());
    }
  }

  cancel(id: string) {
    if (confirm('¿Cancelar esta orden de compra?')) {
      this.poService.cancel(id).subscribe(() => this.loadData());
    }
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
      submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      sent: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      partially_received: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    };
    return map[status] || 'bg-slate-100 text-slate-800';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      draft: 'Borrador',
      submitted: 'Enviada',
      approved: 'Aprobada',
      rejected: 'Rechazada',
      sent: 'Enviada al proveedor',
      partially_received: 'Recibida parcial',
      completed: 'Completada',
      cancelled: 'Cancelada',
    };
    return map[status] || status;
  }
}
