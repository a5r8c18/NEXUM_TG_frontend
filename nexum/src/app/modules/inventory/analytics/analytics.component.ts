import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../../core/services/inventory.service';

@Component({
  selector: 'app-inventory-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold mb-6 dark:text-white">Analítica de Inventario</h1>

      @if (isLoading()) {
        <div class="flex justify-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      } @else {
        <!-- Filtros -->
        <div class="bg-white dark:bg-slate-800 rounded-xl p-4 mb-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select [(ngModel)]="warehouseFilter" (ngModelChange)="loadRotation()" class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:text-white text-sm">
              <option value="">Todos los almacenes</option>
              <option value="1">Almacén 1</option>
              <option value="2">Almacén 2</option>
            </select>
            <select [(ngModel)]="categoryFilter" (ngModelChange)="loadRotation()" class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:text-white text-sm">
              <option value="">Todas las categorías</option>
              <option value="insumo">Insumo</option>
              <option value="mercaduria">Mercancía</option>
              <option value="produccion">Producción</option>
            </select>
            <select [(ngModel)]="periodFilter" (ngModelChange)="loadRotation()" class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:text-white text-sm">
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 90 días</option>
              <option value="180">Últimos 6 meses</option>
              <option value="365">Último año</option>
            </select>
            <button (click)="loadRotation()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">Actualizar</button>
          </div>
        </div>

        <!-- KPIs -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
            <p class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Rotación Promedio</p>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">{{ rotationData()?.averageRotation || 0 }}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">veces/año</p>
          </div>
          <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
            <p class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Días de Inventario</p>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">{{ rotationData()?.averageDaysInventory || 0 }}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">días</p>
          </div>
          <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
            <p class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Productos ABC - A</p>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">{{ rotationData()?.abcAnalysis?.A || 0 }}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">productos críticos</p>
          </div>
          <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
            <p class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Movimiento Lento</p>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">{{ slowMovingData().length || 0 }}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">productos</p>
          </div>
        </div>

        <!-- Tablas -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Rotación por Producto -->
          <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 class="text-lg font-semibold dark:text-white">Rotación por Producto</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Producto</th>
                    <th class="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Rotación</th>
                    <th class="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Días</th>
                    <th class="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">ABC</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of rotationData()?.byProduct || []; track item.productCode) {
                    <tr class="border-t border-slate-100 dark:border-slate-700">
                      <td class="px-4 py-3 dark:text-slate-300">
                        <div class="font-medium">{{ item.productName }}</div>
                        <div class="text-xs text-slate-500 dark:text-slate-400">{{ item.productCode }}</div>
                      </td>
                      <td class="px-4 py-3 text-right dark:text-slate-300">{{ item.rotation | number:'1.2-2' }}</td>
                      <td class="px-4 py-3 text-right dark:text-slate-300">{{ item.daysInventory | number:'1.0-0' }}</td>
                      <td class="px-4 py-3 text-center">
                        <span [class]="getAbcClass(item.abcClass)" class="px-2 py-1 rounded-full text-xs font-bold">{{ item.abcClass }}</span>
                      </td>
                    </tr>
                  } @empty {
                    <tr><td colspan="4" class="px-4 py-8 text-center text-slate-500 dark:text-slate-400">Sin datos</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Movimiento Lento -->
          <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 class="text-lg font-semibold dark:text-white">Productos con Movimiento Lento</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Producto</th>
                    <th class="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Stock</th>
                    <th class="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Valor</th>
                    <th class="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Días</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of slowMovingData() || []; track item.productCode) {
                    <tr class="border-t border-slate-100 dark:border-slate-700">
                      <td class="px-4 py-3 dark:text-slate-300">
                        <div class="font-medium">{{ item.productName }}</div>
                        <div class="text-xs text-slate-500 dark:text-slate-400">{{ item.productCode }}</div>
                      </td>
                      <td class="px-4 py-3 text-right dark:text-slate-300">{{ item.stock | number:'1.0-0' }}</td>
                      <td class="px-4 py-3 text-right dark:text-slate-300">{{ item.totalValue | number:'1.2-2' }}</td>
                      <td class="px-4 py-3 text-center dark:text-slate-300">{{ item.daysSinceLastMove | number:'1.0-0' }}</td>
                    </tr>
                  } @empty {
                    <tr><td colspan="4" class="px-4 py-8 text-center text-slate-500 dark:text-slate-400">Sin productos con movimiento lento</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class InventoryAnalyticsComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  rotationData = signal<any>(null);
  slowMovingData = signal<any[]>([]);
  isLoading = signal(false);
  warehouseFilter = '';
  categoryFilter = '';
  periodFilter = '90';

  ngOnInit() { 
    this.loadRotation(); 
    this.loadSlowMoving();
  }

  loadRotation() {
    this.isLoading.set(true);
    // Simular datos de rotación ya que el endpoint no existe en InventoryService
    this.rotationData.set({
      averageRotation: 4.2,
      averageDaysInventory: 87,
      abcAnalysis: { A: 12, B: 28, C: 45 },
      byProduct: []
    });
    this.isLoading.set(false);
  }

  loadSlowMoving() {
    // Simular datos de movimiento lento mientras el endpoint no existe
    this.slowMovingData.set([]);
  }

  getAbcClass(cls: string): string {
    const map: Record<string, string> = {
      A: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 font-bold',
      B: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 font-semibold',
      C: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    };
    return map[cls] || 'bg-slate-100 text-slate-800';
  }
}
