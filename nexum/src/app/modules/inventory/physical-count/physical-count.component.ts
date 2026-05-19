import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PhysicalCountService } from '../../../core/services/physical-count.service';

@Component({
  selector: 'app-physical-count',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold dark:text-white">Conteo Físico</h1>
        <button (click)="showCreate.set(true)" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">+ Nuevo Conteo</button>
      </div>

      <div class="flex gap-3 mb-4">
        <select [(ngModel)]="statusFilter" (ngModelChange)="loadData()" class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:text-white text-sm">
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="in_progress">En Progreso</option>
          <option value="completed">Completado</option>
          <option value="approved">Aprobado</option>
          <option value="cancelled">Cancelado</option>
        </select>
        <select [(ngModel)]="warehouseFilter" (ngModelChange)="loadData()" class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:text-white text-sm">
          <option value="">Todos los almacenes</option>
          <option value="1">Almacén 1</option>
          <option value="2">Almacén 2</option>
        </select>
        <input type="date" [(ngModel)]="fromDate" (ngModelChange)="loadData()" class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:text-white text-sm" />
        <input type="date" [(ngModel)]="toDate" (ngModelChange)="loadData()" class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:text-white text-sm" />
      </div>

      @if (isLoading()) {
        <div class="flex justify-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      } @else {
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">ID</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Almacén</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Creado por</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Fecha Creación</th>
                <th class="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Ítems</th>
                <th class="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Estado</th>
                <th class="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (count of items(); track count.id) {
                <tr class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td class="px-4 py-3 dark:text-slate-300 font-mono text-xs">{{ count.id.slice(0, 8) }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ count.warehouseName }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ count.createdBy }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ count.createdAt | date:'short' }}</td>
                  <td class="px-4 py-3 text-center dark:text-slate-300">{{ count.items?.length || 0 }}</td>
                  <td class="px-4 py-3 text-center">
                    <span [class]="getStatusClass(count.status)" class="px-2 py-1 rounded-full text-xs font-medium">{{ getStatusLabel(count.status) }}</span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    @if (count.status === 'draft') {
                      <button (click)="startCount(count.id)" class="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors mr-1">Iniciar</button>
                    }
                    @if (count.status === 'in_progress') {
                      <button (click)="completeCount(count.id)" class="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition-colors mr-1">Completar</button>
                    }
                    @if (count.status === 'completed') {
                      <button (click)="approveCount(count.id)" class="bg-purple-600 text-white px-3 py-1 rounded text-xs hover:bg-purple-700 transition-colors mr-1">Aprobar</button>
                    }
                    @if (['draft', 'in_progress'].includes(count.status)) {
                      <button (click)="cancelCount(count.id)" class="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition-colors">Cancelar</button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No hay conteos físicos</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `
})
export class PhysicalCountComponent implements OnInit {
  private physicalCountService = inject(PhysicalCountService);
  items = signal<any[]>([]);
  isLoading = signal(false);
  showCreate = signal(false);
  statusFilter = '';
  warehouseFilter = '';
  fromDate = '';
  toDate = '';

  ngOnInit() { this.loadData(); }

  loadData() {
    this.isLoading.set(true);
    this.physicalCountService.getAll({
      status: this.statusFilter || undefined,
      warehouseId: this.warehouseFilter || undefined,
      startDate: this.fromDate || undefined,
      endDate: this.toDate || undefined,
    }).subscribe({
      next: (data) => { this.items.set(data); this.isLoading.set(false); },
      error: () => this.isLoading.set(false),
    });
  }

  startCount(id: string) {
    this.physicalCountService.startCount(id).subscribe(() => this.loadData());
  }

  completeCount(id: string) {
    this.physicalCountService.completeCount(id).subscribe(() => this.loadData());
  }

  approveCount(id: string) {
    this.physicalCountService.approveCount(id).subscribe(() => this.loadData());
  }

  cancelCount(id: string) {
    if (confirm('¿Cancelar este conteo físico?')) {
      this.physicalCountService.cancelCount(id).subscribe(() => this.loadData());
    }
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
      in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      completed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return map[status] || 'bg-slate-100 text-slate-800';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      draft: 'Borrador',
      in_progress: 'En Progreso',
      completed: 'Completado',
      approved: 'Aprobado',
      cancelled: 'Cancelado',
    };
    return map[status] || status;
  }
}
