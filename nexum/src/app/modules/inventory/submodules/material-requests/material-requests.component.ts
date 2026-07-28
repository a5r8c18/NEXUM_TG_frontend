import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialRequestsService, MaterialRequest } from '../../../../core/services/material-requests.service';
import { WarehouseService } from '../../../../core/services/warehouse.service';
import { ProductsService } from '../../../../core/services/products.service';
import { NotificationService } from '../../../../core/services/notification.service';

interface RequestItem {
  productCode: string;
  description: string;
  requestedQuantity: number;
  approvedQuantity?: number;
  productUnit?: string;
}

@Component({
  selector: 'app-material-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
    <div class="p-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold dark:text-white">Solicitudes de Materiales</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400">Crear, aprobar y entregar solicitudes de materiales al almacén.</p>
        </div>
        <button (click)="showCreate.set(true)" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">Nueva solicitud</button>
      </div>

      <div class="mb-4 flex gap-3">
        <select [(ngModel)]="statusFilter" (ngModelChange)="loadData()" class="px-3 py-2 border rounded-lg text-sm dark:bg-slate-800 dark:text-slate-300">
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="pending">Pendiente</option>
          <option value="approved">Aprobada</option>
          <option value="delivered">Entregada</option>
          <option value="rejected">Rechazada</option>
          <option value="cancelled">Cancelada</option>
        </select>
      </div>

      @if (isLoading()) {
        <div class="text-center py-20 text-slate-500">Cargando solicitudes...</div>
      } @else if (requests().length === 0) {
        <div class="text-center py-20 text-slate-500 dark:text-slate-400">No hay solicitudes registradas</div>
      } @else {
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Número</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Fecha</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Almacén</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Propósito</th>
                <th class="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Estado</th>
                <th class="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (r of requests(); track r.id) {
                <tr class="border-t border-slate-100 dark:border-slate-700">
                  <td class="px-4 py-3 font-mono text-xs dark:text-slate-300">{{ r.requestNumber }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ r.requestDate | date:'yyyy-MM-dd' }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ r.warehouseName || r.warehouseId }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ r.purpose }}</td>
                  <td class="px-4 py-3 text-center">
                    <span class="px-2 py-1 rounded-full text-xs border {{ getStatusClass(r.status) }}">{{ getStatusLabel(r.status) }}</span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    @if (r.status === 'pending' || r.status === 'draft') {
                      <button (click)="approve(r.id)" class="text-green-600 hover:text-green-800 text-xs mr-2">Aprobar</button>
                      <button (click)="reject(r.id)" class="text-red-600 hover:text-red-800 text-xs mr-2">Rechazar</button>
                      <button (click)="cancel(r.id)" class="text-slate-600 hover:text-slate-800 text-xs">Cancelar</button>
                    }
                    @if (r.status === 'approved') {
                      <button (click)="deliver(r.id)" class="text-blue-600 hover:text-blue-800 text-xs">Entregar</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (showCreate()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div class="bg-white dark:bg-slate-800 rounded-xl shadow-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 class="text-lg font-bold mb-4 dark:text-white">Nueva Solicitud de Material</h2>
            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Almacén destino</label>
                  <select [(ngModel)]="newRequest.warehouseId" class="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-900">
                    <option value="">Seleccione...</option>
                    @for (wh of warehouses(); track wh.id) {
                      <option [value]="wh.id">{{ wh.name }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Propósito</label>
                  <input [(ngModel)]="newRequest.purpose" class="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-900" placeholder="Ej. Mantenimiento" />
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Notas</label>
                <textarea [(ngModel)]="newRequest.notes" class="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-900" rows="2"></textarea>
              </div>

              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="block text-xs font-medium text-slate-600 dark:text-slate-400">Productos</label>
                  <button (click)="addItem()" class="text-xs text-blue-600 hover:text-blue-800">+ Añadir producto</button>
                </div>
                @for (item of newRequest.items; track $index) {
                  <div class="grid grid-cols-12 gap-2 mb-2 items-end">
                    <div class="col-span-5">
                      <select [(ngModel)]="item.productCode" (ngModelChange)="onProductChange(item, $event)" class="w-full px-2 py-2 border rounded-lg text-sm dark:bg-slate-900">
                        <option value="">Producto...</option>
                        @for (p of products(); track p.code) {
                          <option [value]="p.code">{{ p.name }}</option>
                        }
                      </select>
                    </div>
                    <div class="col-span-3">
                      <input type="number" [(ngModel)]="item.requestedQuantity" min="1" class="w-full px-2 py-2 border rounded-lg text-sm dark:bg-slate-900" placeholder="Cantidad" />
                    </div>
                    <div class="col-span-3">
                      <input [(ngModel)]="item.productUnit" class="w-full px-2 py-2 border rounded-lg text-sm dark:bg-slate-900" placeholder="Unidad" />
                    </div>
                    <div class="col-span-1">
                      <button (click)="removeItem($index)" class="text-red-600 hover:text-red-800 text-sm">×</button>
                    </div>
                  </div>
                }
              </div>
            </div>
            <div class="flex justify-end gap-3 mt-6">
              <button (click)="showCreate.set(false)" class="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300">Cancelar</button>
              <button (click)="create()" [disabled]="isSaving()" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">Guardar</button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class MaterialRequestsComponent implements OnInit {
  private materialRequestsService = inject(MaterialRequestsService);
  private warehouseService = inject(WarehouseService);
  private productsService = inject(ProductsService);
  private notificationService = inject(NotificationService);

  requests = signal<MaterialRequest[]>([]);
  warehouses = signal<{ id: string; name: string }[]>([]);
  products = signal<{ code: string; name: string; unit?: string }[]>([]);
  isLoading = signal(false);
  isSaving = signal(false);
  statusFilter = signal('');
  showCreate = signal(false);
  newRequest: any = { warehouseId: '', purpose: '', notes: '', items: [] };

  ngOnInit() {
    this.loadData();
    this.loadWarehouses();
    this.loadProducts();
  }

  loadData() {
    this.isLoading.set(true);
    this.materialRequestsService.getAll({ status: this.statusFilter() }).subscribe({
      next: (data) => { this.requests.set(data || []); this.isLoading.set(false); },
      error: () => { this.isLoading.set(false); this.notificationService.showError('Error cargando solicitudes'); },
    });
  }

  loadWarehouses() {
    this.warehouseService.getWarehouses().subscribe({
      next: (data) => this.warehouses.set((data || []).map((w: any) => ({ id: w.id, name: w.name }))),
      error: () => this.warehouses.set([]),
    });
  }

  loadProducts() {
    this.productsService.getAll().subscribe({
      next: (data: any) => this.products.set(data || []),
      error: () => this.products.set([]),
    });
  }

  addItem() { this.newRequest.items.push({ productCode: '', requestedQuantity: 1, productUnit: 'und' }); }
  removeItem(index: number) { this.newRequest.items.splice(index, 1); }

  onProductChange(item: RequestItem, code: string) {
    const p = this.products().find(x => x.code === code);
    item.description = p?.name || '';
    item.productUnit = p?.unit || 'und';
  }

  create() {
    this.isSaving.set(true);
    this.materialRequestsService.create(this.newRequest).subscribe({
      next: () => {
        this.notificationService.showSuccess('Solicitud creada');
        this.showCreate.set(false);
        this.newRequest = { warehouseId: '', purpose: '', notes: '', items: [] };
        this.loadData();
        this.isSaving.set(false);
      },
      error: (err) => {
        this.notificationService.showError(err?.error?.message || 'Error creando solicitud');
        this.isSaving.set(false);
      },
    });
  }

  approve(id: string) {
    this.materialRequestsService.approve(id).subscribe({
      next: () => { this.notificationService.showSuccess('Solicitud aprobada'); this.loadData(); },
      error: () => this.notificationService.showError('Error aprobando'),
    });
  }

  deliver(id: string) {
    this.materialRequestsService.deliver(id).subscribe({
      next: () => { this.notificationService.showSuccess('Solicitud entregada'); this.loadData(); },
      error: () => this.notificationService.showError('Error entregando'),
    });
  }

  reject(id: string) {
    this.materialRequestsService.reject(id).subscribe({
      next: () => { this.notificationService.showSuccess('Solicitud rechazada'); this.loadData(); },
      error: () => this.notificationService.showError('Error rechazando'),
    });
  }

  cancel(id: string) {
    this.materialRequestsService.cancel(id).subscribe({
      next: () => { this.notificationService.showSuccess('Solicitud cancelada'); this.loadData(); },
      error: () => this.notificationService.showError('Error cancelando'),
    });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-800 border-slate-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-blue-100 text-blue-800 border-blue-200',
      delivered: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return map[status] || '';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      draft: 'Borrador', pending: 'Pendiente', approved: 'Aprobada', delivered: 'Entregada', rejected: 'Rechazada', cancelled: 'Cancelada'
    };
    return map[status] || status;
  }
}
