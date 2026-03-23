import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { DateFilterComponent, FilterValues } from '../../shared/components/filter/date-filter.component';
import { PaginationComponent, PaginationConfig } from '../../shared/components/pagination/pagination.component';
import { ExportComponentComponent, ExportData } from '../../shared/components/export/export-component.component';
import { InventoryService } from '../../core/services/inventory.service';
import { NotificationService } from '../../core/services/notification.service';
import { InventoryItem, InventoryFilters } from '../../models/inventory.models';

@Component({
  selector: 'app-inventory-table',
  standalone: true,
  imports: [DateFilterComponent, PaginationComponent, ExportComponentComponent],
  templateUrl: './inventory-table.component.html'
})
export class InventoryTableComponent implements OnInit, OnDestroy {
  private inventoryService = inject(InventoryService);
  private notificationService = inject(NotificationService);

  allItems = signal<InventoryItem[]>([]);
  filteredItems = signal<InventoryItem[]>([]);
  activeFilters = signal<FilterValues>({});
  isLoading = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  currentPage = signal(1);
  itemsPerPage = signal(5);

  private refreshSub!: Subscription;
  private toastSub!: Subscription;

  ngOnInit(): void {
    this.loadInventory();
    this.refreshSub = this.notificationService.refresh$.subscribe(() => this.loadInventory());
    this.toastSub = this.notificationService.toasts$.subscribe(t => {
      this.toast.set(t);
      setTimeout(() => this.toast.set(null), 4000);
    });
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
    this.toastSub?.unsubscribe();
  }

  loadInventory(filters?: InventoryFilters): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.inventoryService.getInventory(filters).subscribe({
      next: (data) => {
        this.allItems.set(data);
        this.filteredItems.set(data);
        this.currentPage.set(1);
        this.notificationService.checkNotifications(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
        this.notificationService.showError('Error al cargar inventario');
      }
    });
  }

  onFiltersChange(filters: FilterValues): void {
    this.activeFilters.set(filters);
    this.currentPage.set(1);
    const nestFilters: InventoryFilters = {
      fromDate: filters.startDate,
      toDate: filters.endDate,
      product: filters.name || filters.code,
      expirationDate: filters.expirationDate
    };
    this.loadInventory(nestFilters);
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  get paginatedItems(): InventoryItem[] {
    const items = this.filteredItems();
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return items.slice(start, start + this.itemsPerPage());
  }

  get paginationConfig(): PaginationConfig {
    const totalItems = this.filteredItems().length;
    return {
      currentPage: this.currentPage(),
      totalPages: Math.ceil(totalItems / this.itemsPerPage()),
      totalItems,
      itemsPerPage: this.itemsPerPage()
    };
  }

  get exportData(): ExportData {
    return {
      headers: ['Código', 'Nombre', 'Entradas', 'Salidas', 'Existencias'],
      data: this.filteredItems().map(item => [
        item.productCode,
        item.productName,
        item.entries.toString(),
        item.exits.toString(),
        item.stock.toString()
      ]),
      fileName: 'inventario'
    };
  }

  onExportComplete(event: { type: 'pdf' | 'excel'; fileName: string }): void {
    this.notificationService.showSuccess(`Exportación ${event.type.toUpperCase()} completada`);
  }

  getStockClass(stock: number, limit?: number): string {
    if (stock === 0) return 'text-red-600 bg-red-50 border-red-200';
    if (limit != null && stock <= limit) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (stock < 10) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  }

  getStockLabel(stock: number, limit?: number): string {
    if (stock === 0) return 'Sin Stock';
    if (limit != null && stock <= limit) return 'Bajo';
    if (stock < 10) return 'Bajo';
    return 'OK';
  }

  get totalEntradas(): number {
    return this.filteredItems().reduce((s, i) => s + i.entries, 0);
  }

  get totalSalidas(): number {
    return this.filteredItems().reduce((s, i) => s + i.exits, 0);
  }

  get totalExistencias(): number {
    return this.filteredItems().reduce((s, i) => s + i.stock, 0);
  }
}
