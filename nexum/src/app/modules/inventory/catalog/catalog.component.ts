import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductsService } from '../../../core/services/products.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  template: `
    <div class="p-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold dark:text-white">Catálogo de Productos</h1>
        <button (click)="showCreate.set(true)" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">+ Nuevo Producto</button>
      </div>

      <div class="flex gap-3 mb-4">
        <input type="text" [(ngModel)]="searchTerm" (ngModelChange)="loadData()" placeholder="Buscar por código, nombre o CPCU..." class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:text-white text-sm flex-1" />
        <select [(ngModel)]="categoryFilter" (ngModelChange)="loadData()" class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:text-white text-sm">
          <option value="">Todas las categorías</option>
          <option value="insumo">Insumo</option>
          <option value="mercaduria">Mercancía</option>
          <option value="produccion">Producción</option>
        </select>
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
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Nombre</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Categoría</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">CPCU</th>
                <th class="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Precio</th>
                <th class="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Stock Mín</th>
                <th class="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Stock Máx</th>
                <th class="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (product of pagedProducts(); track product.id) {
                <tr class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td class="px-4 py-3 dark:text-slate-300 font-mono text-xs">{{ product.productCode }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ product.productName }}</td>
                  <td class="px-4 py-3">
                    <span [class]="getCategoryClass(product.category)" class="px-2 py-1 rounded-full text-xs font-medium">{{ getCategoryLabel(product.category) }}</span>
                  </td>
                  <td class="px-4 py-3 dark:text-slate-300 font-mono text-xs">{{ product.cpcuCode || '-' }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ product.unitPrice | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ product.minStock || 0 }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ product.maxStock || 0 }}</td>
                  <td class="px-4 py-3 text-center">
                    <span [class]="product.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400'" class="px-2 py-1 rounded-full text-xs font-medium">
                      {{ product.isActive ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="8" class="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No hay productos</td></tr>
              }
            </tbody>
          </table>
        </div>

        <app-pagination [config]="paginationConfig()" (pageChange)="currentPage.set($event)"></app-pagination>
      }
    </div>
  `
})
export class CatalogComponent implements OnInit {
  private productsService = inject(ProductsService);
  products = signal<any[]>([]);
  isLoading = signal(false);
  showCreate = signal(false);
  searchTerm = '';
  categoryFilter = '';
  activeFilter = '';
  currentPage = signal(1);
  pageSize = 20;

  filteredProducts = computed(() => {
    let filtered = this.products();
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.productCode.toLowerCase().includes(term) ||
        p.productName.toLowerCase().includes(term) ||
        (p.cpcuCode && p.cpcuCode.toLowerCase().includes(term))
      );
    }
    if (this.categoryFilter) {
      filtered = filtered.filter(p => p.category === this.categoryFilter);
    }
    if (this.activeFilter) {
      filtered = filtered.filter(p => p.isActive === (this.activeFilter === 'true'));
    }
    return filtered;
  });

  pagedProducts = computed(() => {
    const filtered = this.filteredProducts();
    const start = (this.currentPage() - 1) * this.pageSize;
    return filtered.slice(start, start + this.pageSize);
  });

  paginationConfig = computed(() => ({
    currentPage: this.currentPage(),
    totalItems: this.filteredProducts().length,
    pageSize: this.pageSize,
    totalPages: Math.ceil(this.filteredProducts().length / this.pageSize),
    itemsPerPage: this.pageSize,
  }));

  ngOnInit() { this.loadData(); }

  loadData() {
    this.isLoading.set(true);
    this.productsService.getAll({
      search: this.searchTerm || undefined,
      category: this.categoryFilter || undefined,
      isActive: this.activeFilter ? this.activeFilter === 'true' : undefined,
    }).subscribe({
      next: (data) => { this.products.set(data.items || data); this.isLoading.set(false); },
      error: () => this.isLoading.set(false),
    });
  }

  getCategoryClass(category: string): string {
    const map: Record<string, string> = {
      insumo: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      mercaduria: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      produccion: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    };
    return map[category] || 'bg-slate-100 text-slate-800';
  }

  getCategoryLabel(category: string): string {
    const map: Record<string, string> = { insumo: 'Insumo', mercaduria: 'Mercancía', produccion: 'Producción' };
    return map[category] || category;
  }
}
