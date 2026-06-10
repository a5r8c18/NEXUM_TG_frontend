import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductsService } from '../../../core/services/products.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, ModalComponent],
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
          <option value="mercancia">Mercancía</option>
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

    <!-- Modal: Crear Producto -->
    <app-modal
      [isOpen]="showCreate()"
      title="Nuevo Producto"
      confirmText="Guardar"
      iconEmoji="📦"
      iconBgClass="bg-blue-50"
      confirmButtonClass="bg-blue-600 hover:bg-blue-700"
      maxWidthClass="max-w-lg"
      (closeEvent)="closeCreate()"
      (confirmEvent)="saveProduct()">
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Código <span class="text-red-500">*</span></label>
            <input type="text" [(ngModel)]="newProduct.productCode" placeholder="PROD-001"
                   class="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
          </div>
          <div class="space-y-1">
            <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Nombre <span class="text-red-500">*</span></label>
            <input type="text" [(ngModel)]="newProduct.productName" placeholder="Nombre del producto"
                   class="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
          </div>
        </div>
        <div class="space-y-1">
          <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Descripción</label>
          <textarea [(ngModel)]="newProduct.productDescription" rows="2" placeholder="Descripción del producto..."
                    class="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"></textarea>
        </div>
        @if (createError()) {
          <p class="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{{ createError() }}</p>
        }
      </div>
    </app-modal>
  `
})
export class CatalogComponent implements OnInit {
  private productsService = inject(ProductsService);
  products = signal<any[]>([]);
  isLoading = signal(false);
  showCreate = signal(false);
  createError = signal('');
  searchTerm = '';
  categoryFilter = '';
  activeFilter = '';
  currentPage = signal(1);
  pageSize = 20;

  newProduct = {
    productCode: '',
    productName: '',
    productDescription: '',
  };

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
      mercancia: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      produccion: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    };
    return map[category] || 'bg-slate-100 text-slate-800';
  }

  getCategoryLabel(category: string): string {
    const map: Record<string, string> = { insumo: 'Insumo', mercancia: 'Mercancía', produccion: 'Producción' };
    return map[category] || category;
  }

  closeCreate(): void {
    this.showCreate.set(false);
    this.createError.set('');
    this.newProduct = {
      productCode: '', productName: '', productDescription: '',
    };
  }

  saveProduct(): void {
    if (!this.newProduct.productCode.trim() || !this.newProduct.productName.trim()) {
      this.createError.set('Código y nombre son obligatorios');
      return;
    }
    this.createError.set('');
    this.productsService.create(this.newProduct).subscribe({
      next: () => {
        this.closeCreate();
        this.loadData();
      },
      error: (err) => {
        this.createError.set(err?.error?.message || 'Error al crear producto');
      }
    });
  }
}
