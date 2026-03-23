import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { StockLimitsService } from '../../../../../core/services/stock-limits.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { ContextService } from '../../../../../core/services/context.service';
import { StockLimit, CreateStockLimitRequest, StockLimitWarning } from '../../../../../core/models/stock-limits.model';
import { PaginationComponent, PaginationConfig } from '../../../../../shared/components/pagination/pagination.component';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-stock-limits-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, ModalComponent],
  templateUrl: './stock-limits-list.component.html'
})
export class StockLimitsListComponent implements OnInit, OnDestroy {
  private stockLimitsService = inject(StockLimitsService);
  private notificationService = inject(NotificationService);
  private contextService = inject(ContextService);

  stockLimits = signal<StockLimit[]>([]);
  warnings = signal<StockLimitWarning[]>([]);
  isLoading = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // UI state
  currentPage = signal(1);
  pageSize = 8;
  searchTerm = signal('');
  warehouseFilter = signal<string>('');
  statusFilter = signal<string>('all');
  isCreateOpen = signal(false);
  isEditOpen = signal(false);
  selectedStockLimit = signal<StockLimit | null>(null);

  // Form data
  formData = signal<CreateStockLimitRequest>({
    productId: '',
    warehouseId: '',
    minStock: 0,
    maxStock: 0,
    reorderPoint: 0,
  });

  // Available data
  availableProducts = signal<any[]>([]);
  availableWarehouses = signal<any[]>([]);

  private refreshSub!: Subscription;
  private toastSub!: Subscription;

  ngOnInit(): void {
    this.loadStockLimits();
    this.loadWarnings();
    this.loadAvailableData();
    this.refreshSub = this.notificationService.refresh$.subscribe(() => {
      this.loadStockLimits();
      this.loadWarnings();
    });
    this.toastSub = this.notificationService.toasts$.subscribe(t => {
      this.toast.set(t);
      setTimeout(() => this.toast.set(null), 4000);
    });
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
    this.toastSub?.unsubscribe();
  }

  get currentCompanyId(): string | undefined {
    return this.contextService.currentCompany()?.id;
  }

  loadAvailableData(): void {
    // Load available products
    this.stockLimitsService.getProductsForStockLimits(this.currentCompanyId).subscribe({
      next: (products) => {
        this.availableProducts.set(products);
      },
      error: () => {
        console.warn('Error al cargar productos disponibles');
      }
    });

    // Load available warehouses
    this.availableWarehouses.set([
      { id: 'wh1', name: 'Almacén Principal' },
      { id: 'wh2', name: 'Almacén Secundario' },
      { id: 'wh3', name: 'Almacén Temporal' }
    ]);
  }

  loadStockLimits(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    
    const warehouseId = this.warehouseFilter();
    this.stockLimitsService.getStockLimits(this.currentCompanyId, warehouseId).subscribe({
      next: (data) => {
        this.stockLimits.set(data);
        this.currentPage.set(1);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
        this.showToast('Error al cargar los límites de stock', 'error');
      }
    });
  }

  loadWarnings(): void {
    const warehouseId = this.warehouseFilter();
    this.stockLimitsService.getStockWarnings(this.currentCompanyId, warehouseId).subscribe({
      next: (data) => {
        this.warnings.set(data);
      },
      error: () => {
        console.warn('Error al cargar las advertencias de stock');
      }
    });
  }

  filteredStockLimits(): StockLimit[] {
    const search = this.searchTerm().toLowerCase();
    const status = this.statusFilter();
    
    return this.stockLimits().filter(limit => {
      const matchesSearch = !search || 
        limit.productName.toLowerCase().includes(search) ||
        limit.productCode.toLowerCase().includes(search) ||
        limit.warehouseName.toLowerCase().includes(search);
      
      const matchesStatus = status === 'all' || 
        (status === 'active' && limit.isActive) ||
        (status === 'inactive' && !limit.isActive);
      
      return matchesSearch && matchesStatus;
    });
  }

  pagedStockLimits(): StockLimit[] {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredStockLimits().slice(start, start + this.pageSize);
  }

  paginationConfig(): PaginationConfig {
    const total = this.filteredStockLimits().length;
    return {
      currentPage: this.currentPage(),
      totalPages: Math.ceil(total / this.pageSize),
      totalItems: total,
      itemsPerPage: this.pageSize,
    };
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  onWarehouseFilterChange(): void {
    this.loadStockLimits();
    this.loadWarnings();
  }

  openCreate(): void {
    this.formData.set({
      productId: '',
      warehouseId: '',
      minStock: 0,
      maxStock: 0,
      reorderPoint: 0,
    });
    this.isCreateOpen.set(true);
  }

  closeCreate(): void {
    this.isCreateOpen.set(false);
  }

  openEdit(stockLimit: StockLimit): void {
    this.selectedStockLimit.set(stockLimit);
    this.formData.set({
      productId: stockLimit.productId,
      warehouseId: stockLimit.warehouseId,
      minStock: stockLimit.minStock,
      maxStock: stockLimit.maxStock,
      reorderPoint: stockLimit.reorderPoint,
    });
    this.isEditOpen.set(true);
  }

  closeEdit(): void {
    this.isEditOpen.set(false);
    this.selectedStockLimit.set(null);
  }

  createStockLimit(): void {
    const data = this.formData();
    if (!data.productId || !data.warehouseId) {
      this.showToast('Debe seleccionar un producto y un almacén', 'error');
      return;
    }
    if (data.minStock < 0 || data.maxStock < 0 || data.reorderPoint < 0) {
      this.showToast('Los valores deben ser mayores o iguales a cero', 'error');
      return;
    }
    if (data.minStock > data.maxStock) {
      this.showToast('El stock mínimo no puede ser mayor al stock máximo', 'error');
      return;
    }
    
    this.stockLimitsService.createStockLimit(data).subscribe({
      next: () => {
        this.showToast('Límite de stock creado exitosamente', 'success');
        this.closeCreate();
        this.loadStockLimits();
        this.loadWarnings();
      },
      error: () => this.showToast('Error al crear el límite de stock', 'error')
    });
  }

  updateStockLimit(): void {
    const data = this.formData();
    const id = this.selectedStockLimit()!.id;
    
    if (data.minStock < 0 || data.maxStock < 0 || data.reorderPoint < 0) {
      this.showToast('Los valores deben ser mayores o iguales a cero', 'error');
      return;
    }
    if (data.minStock > data.maxStock) {
      this.showToast('El stock mínimo no puede ser mayor al stock máximo', 'error');
      return;
    }
    
    this.stockLimitsService.updateStockLimit(id, data).subscribe({
      next: () => {
        this.showToast('Límite de stock actualizado exitosamente', 'success');
        this.closeEdit();
        this.loadStockLimits();
        this.loadWarnings();
      },
      error: () => this.showToast('Error al actualizar el límite de stock', 'error')
    });
  }

  deleteStockLimit(stockLimit: StockLimit): void {
    if (!confirm(`¿Está seguro de eliminar el límite de stock para "${stockLimit.productName}"?`)) return;
    this.stockLimitsService.deleteStockLimit(stockLimit.id).subscribe({
      next: () => {
        this.showToast('Límite de stock eliminado exitosamente', 'success');
        this.loadStockLimits();
        this.loadWarnings();
      },
      error: () => this.showToast('Error al eliminar el límite de stock', 'error')
    });
  }

  toggleStockLimitStatus(stockLimit: StockLimit): void {
    const newStatus = !stockLimit.isActive;
    const action = newStatus ? 'activar' : 'desactivar';
    
    if (!confirm(`¿Está seguro de ${action} este límite de stock?`)) return;
    
    this.stockLimitsService.updateStockLimit(stockLimit.id, { isActive: newStatus }).subscribe({
      next: () => {
        this.showToast(`Límite de stock ${action}do exitosamente`, 'success');
        this.loadStockLimits();
      },
      error: () => this.showToast(`Error al ${action} el límite de stock`, 'error')
    });
  }

  getStockStatus(currentStock: number, minStock: number, maxStock: number): { status: string; color: string } {
    if (currentStock === 0) return { status: 'Sin stock', color: 'text-red-600' };
    if (currentStock < minStock) return { status: 'Stock bajo', color: 'text-orange-600' };
    if (currentStock > maxStock) return { status: 'Sobrestock', color: 'text-blue-600' };
    return { status: 'Óptimo', color: 'text-green-600' };
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES');
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }
}
