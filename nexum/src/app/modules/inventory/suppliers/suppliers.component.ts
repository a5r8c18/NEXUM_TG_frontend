import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuppliersService } from '../../../core/services/suppliers.service';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold dark:text-white">Proveedores</h1>
        <button (click)="showCreate.set(true)" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">+ Nuevo Proveedor</button>
      </div>

      <div class="flex gap-3 mb-4">
        <input type="text" [(ngModel)]="searchTerm" (ngModelChange)="loadData()" placeholder="Buscar por nombre, código o NIT..." class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:text-white text-sm flex-1" />
        <select [(ngModel)]="activeFilter" (ngModelChange)="loadData()" class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:text-white text-sm">
          <option value="">Todos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
      </div>

      @if (isLoading()) {
        <div class="flex justify-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      } @else {
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Código</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Razón Social</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Nombre Comercial</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">NIT</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Contacto</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Teléfono</th>
                <th class="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (supplier of items(); track supplier.id) {
                <tr class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td class="px-4 py-3 dark:text-slate-300 font-mono text-xs">{{ supplier.supplierCode }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">
                    <div class="font-medium">{{ supplier.businessName }}</div>
                    <div class="text-xs text-slate-500 dark:text-slate-400">{{ supplier.city }}, {{ supplier.province }}</div>
                  </td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ supplier.tradeName || '-' }}</td>
                  <td class="px-4 py-3 dark:text-slate-300 font-mono text-xs">{{ supplier.nit }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ supplier.contactPerson || '-' }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ supplier.contactPhone || '-' }}</td>
                  <td class="px-4 py-3 text-center">
                    <span [class]="supplier.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400'" class="px-2 py-1 rounded-full text-xs font-medium">
                      {{ supplier.isActive ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No hay proveedores</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `
})
export class SuppliersComponent implements OnInit {
  private suppliersService = inject(SuppliersService);
  items = signal<any[]>([]);
  isLoading = signal(false);
  showCreate = signal(false);
  searchTerm = '';
  activeFilter = '';

  ngOnInit() { this.loadData(); }

  loadData() {
    this.isLoading.set(true);
    this.suppliersService.getAll({
      search: this.searchTerm || undefined,
      isActive: this.activeFilter ? this.activeFilter === 'true' : undefined,
    }).subscribe({
      next: (data) => { this.items.set(data); this.isLoading.set(false); },
      error: () => this.isLoading.set(false),
    });
  }
}
