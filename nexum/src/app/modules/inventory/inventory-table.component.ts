import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DateFilterComponent, FilterValues } from '../../shared/components/filter/date-filter.component';
import { PaginationComponent, PaginationConfig } from '../../shared/components/pagination/pagination.component';
import { ExportComponentComponent, ExportData } from '../../shared/components/export/export-component.component';
import { WarehouseService } from '../../core/services/warehouse.service';
import { NotificationService } from '../../core/services/notification.service';
import { StockLimitsService } from '../../core/services/stock-limits.service';
import { InventoryItem, InventoryFilters } from '../../models/inventory.models';
import { StockLimit } from '../../core/models/stock-limits.model';
import { OfflineFirstService } from '../../core/offline/offline-first.service';

@Component({
  selector: 'app-inventory-table',
  standalone: true,
  imports: [DateFilterComponent, PaginationComponent, ExportComponentComponent, DecimalPipe],
  templateUrl: './inventory-table.component.html'
})
export class InventoryTableComponent implements OnInit, OnDestroy {
  private warehouseService = inject(WarehouseService);
  private notificationService = inject(NotificationService);
  private stockLimitsService = inject(StockLimitsService);
  private offlineFirst = inject(OfflineFirstService);
  private router = inject(Router);

  items = signal<InventoryItem[]>([]);
  stockLimits = signal<StockLimit[]>([]);
  activeFilters = signal<FilterValues>({});
  selectedWarehouseId = signal<string>('');
  isLoading = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  warehouses = signal<{ id: string; name: string }[]>([]);

  currentPage = signal(1);
  itemsPerPage = signal(5);

  private refreshSub!: Subscription;
  private toastSub!: Subscription;

  ngOnInit(): void {
    this.loadWarehouses();
    this.loadInventory();
    this.loadStockLimits();
    this.refreshSub = this.notificationService.refresh$.subscribe(() => {
      this.reloadWithCurrentFilters();
      this.loadStockLimits();
    });
    this.toastSub = this.notificationService.toasts$.subscribe(t => {
      this.toast.set(t);
      setTimeout(() => this.toast.set(null), 4000);
    });
  }

  private loadStockLimits(): void {
    const warehouseId = this.selectedWarehouseId() || undefined;
    this.stockLimitsService.getStockLimits(undefined, warehouseId).subscribe({
      next: (data) => this.stockLimits.set(data),
      error: () => this.stockLimits.set([]),
    });
  }

  private loadWarehouses(): void {
    this.warehouseService.getWarehouses().subscribe({
      next: (data) => {
        this.warehouses.set(data.map((wh: any) => ({ id: wh.id, name: wh.name })));
      },
      error: (err) => {
        console.error('❌ Error cargando almacenes:', err);
        this.warehouses.set([]);
      }
    });
  }

  onWarehouseFilterChange(warehouseId: string): void {
    this.selectedWarehouseId.set(warehouseId);
    this.currentPage.set(1);
    this.reloadWithCurrentFilters();
    this.loadStockLimits();
  }

  private buildNestFilters(): InventoryFilters {
    const f = this.activeFilters();
    return {
      fromDate: f.startDate,
      toDate: f.endDate,
      product: f.name || f.code,
      expirationDate: f.expirationDate,
      warehouse: this.selectedWarehouseId() || undefined,
    };
  }

  private reloadWithCurrentFilters(): void {
    this.loadInventory(this.buildNestFilters());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
    this.toastSub?.unsubscribe();
  }

  loadInventory(filters?: InventoryFilters): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.offlineFirst.getInventory(filters).subscribe({
      next: (data) => {
        this.items.set(data);
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
    this.reloadWithCurrentFilters();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  get paginatedItems(): InventoryItem[] {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return this.items().slice(start, start + this.itemsPerPage());
  }

  get paginationConfig(): PaginationConfig {
    const totalItems = this.items().length;
    return {
      currentPage: this.currentPage(),
      totalPages: Math.ceil(totalItems / this.itemsPerPage()),
      totalItems,
      itemsPerPage: this.itemsPerPage()
    };
  }

  get exportData(): ExportData {
    return {
      headers: ['Código', 'Nombre', 'Almacén', 'Entradas', 'Salidas', 'Existencias'],
      data: this.items().map(item => [
        item.productCode,
        item.productName,
        item.warehouse || 'Sin almacén',
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

  getStockClass(stock: number, productCode: string, warehouseId?: string): string {
    const limit = this.getStockLimit(productCode, warehouseId);
    if (stock === 0) return 'text-red-600 bg-red-50 border-red-200';
    if (limit && stock < limit.minStock) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (limit && stock > limit.maxStock && limit.maxStock > 0) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (stock < 10 && (!limit || limit.minStock === 0)) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  }

  getStockLabel(stock: number, productCode: string, warehouseId?: string): string {
    const limit = this.getStockLimit(productCode, warehouseId);
    if (stock === 0) return 'Sin Stock';
    if (limit && stock < limit.minStock) return 'Bajo';
    if (limit && stock > limit.maxStock && limit.maxStock > 0) return 'Sobrestock';
    if (stock < 10 && (!limit || limit.minStock === 0)) return 'Bajo';
    return 'OK';
  }

  private getStockLimit(productCode: string, warehouseId?: string): StockLimit | undefined {
    const whId = warehouseId || this.selectedWarehouseId();
    return this.stockLimits().find(
      sl => sl.productCode === productCode && (!whId || sl.warehouseId === whId)
    );
  }

  get totalEntradas(): number {
    return this.items().reduce((s, i) => s + i.entries, 0);
  }

  get totalSalidas(): number {
    return this.items().reduce((s, i) => s + i.exits, 0);
  }

  get totalExistencias(): number {
    return this.items().reduce((s, i) => s + i.stock, 0);
  }

  // ─── KPIs ─────────────────────────────────────────────────────────────────

  get totalProducts(): number {
    return this.items().length;
  }

  get totalInventoryValue(): number {
    return this.items().reduce((sum, i) => sum + (i.stock * (i.unitPrice || 0)), 0);
  }

  get outOfStockCount(): number {
    return this.items().filter(i => i.stock === 0).length;
  }

  get lowStockCount(): number {
    return this.items().filter(i => i.stock > 0 && i.stock < 10).length;
  }

  formatCurrency(amount: number): string {
    return '$' + amount.toLocaleString('es-CU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  viewMovementHistory(productCode: string): void {
    this.router.navigate(['/inventory/movements'], {
      queryParams: { product: productCode }
    });
  }
}
