import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, Params } from '@angular/router';
import { Subscription } from 'rxjs';
import { StockLimitsService } from '../../../../../core/services/stock-limits.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { ContextService } from '../../../../../core/services/context.service';
import { StockLimit, CreateStockLimitRequest, UpdateStockLimitRequest } from '../../../../../core/models/stock-limits.model';

@Component({
  selector: 'app-stock-limits-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-limits-form.component.html'
})
export class StockLimitsFormComponent implements OnInit, OnDestroy {
  private stockLimitsService = inject(StockLimitsService);
  private notificationService = inject(NotificationService);
  private contextService = inject(ContextService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isLoading = signal(false);
  isEdit = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Form data
  formData = signal<CreateStockLimitRequest>({
    productId: '',
    warehouseId: '',
    minStock: 0,
    maxStock: 0,
    reorderPoint: 0,
  });

  stockLimitId = signal<string | null>(null);
  errorMessage = signal('');

  // Available data for selects
  availableProducts = signal<any[]>([]);
  availableWarehouses = signal<any[]>([]);

  private routeSub!: Subscription;
  private toastSub!: Subscription;

  ngOnInit(): void {
    this.routeSub = this.route.params.subscribe((params: Params) => {
      const id = params['id'];
      if (id) {
        this.stockLimitId.set(id);
        this.isEdit.set(true);
        this.loadStockLimit(id);
      }
    });

    this.toastSub = this.notificationService.toasts$.subscribe(t => {
      this.toast.set(t);
      setTimeout(() => this.toast.set(null), 4000);
    });

    this.loadAvailableData();
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
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
    // TODO: Implement warehouse service or use existing one
    this.availableWarehouses.set([
      { id: 'wh1', name: 'Almacén Principal' },
      { id: 'wh2', name: 'Almacén Secundario' },
      { id: 'wh3', name: 'Almacén Temporal' }
    ]);
  }

  loadStockLimit(id: string): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    
    this.stockLimitsService.getStockLimit(id).subscribe({
      next: (stockLimit: StockLimit) => {
        this.formData.set({
          productId: stockLimit.productId,
          warehouseId: stockLimit.warehouseId,
          minStock: stockLimit.minStock,
          maxStock: stockLimit.maxStock,
          reorderPoint: stockLimit.reorderPoint,
        });
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
        this.errorMessage.set('Error al cargar el límite de stock');
        this.showToast('Error al cargar el límite de stock', 'error');
      }
    });
  }

  onSubmit(): void {
    this.errorMessage.set('');
    
    // Validaciones
    if (!this.formData().productId?.trim()) {
      this.errorMessage.set('Debe seleccionar un producto');
      return;
    }
    if (!this.formData().warehouseId?.trim()) {
      this.errorMessage.set('Debe seleccionar un almacén');
      return;
    }
    if (this.formData().minStock < 0) {
      this.errorMessage.set('El stock mínimo no puede ser negativo');
      return;
    }
    if (this.formData().maxStock < 0) {
      this.errorMessage.set('El stock máximo no puede ser negativo');
      return;
    }
    if (this.formData().reorderPoint < 0) {
      this.errorMessage.set('El punto de reorden no puede ser negativo');
      return;
    }
    if (this.formData().minStock > this.formData().maxStock) {
      this.errorMessage.set('El stock mínimo no puede ser mayor al stock máximo');
      return;
    }
    if (this.formData().reorderPoint > this.formData().minStock) {
      this.errorMessage.set('El punto de reorden no puede ser mayor al stock mínimo');
      return;
    }

    this.isLoading.set(true);

    if (this.isEdit()) {
      this.updateStockLimit();
    } else {
      this.createStockLimit();
    }
  }

  createStockLimit(): void {
    const data = this.formData();
    
    this.stockLimitsService.createStockLimit(data).subscribe({
      next: () => {
        this.showToast('Límite de stock creado exitosamente', 'success');
        this.router.navigate(['/inventory/stock-limits']);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Error al crear el límite de stock');
        this.showToast('Error al crear el límite de stock', 'error');
      }
    });
  }

  updateStockLimit(): void {
    const data = this.formData() as UpdateStockLimitRequest;
    const id = this.stockLimitId()!;
    
    this.stockLimitsService.updateStockLimit(id, data).subscribe({
      next: () => {
        this.showToast('Límite de stock actualizado exitosamente', 'success');
        this.router.navigate(['/inventory/stock-limits']);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Error al actualizar el límite de stock');
        this.showToast('Error al actualizar el límite de stock', 'error');
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/inventory/stock-limits']);
  }

  get selectedProductName(): string {
    const productId = this.formData().productId;
    const product = this.availableProducts().find(p => p.id === productId);
    return product?.name || '';
  }

  get selectedWarehouseName(): string {
    const warehouseId = this.formData().warehouseId;
    const warehouse = this.availableWarehouses().find(w => w.id === warehouseId);
    return warehouse?.name || '';
  }

  get stockStatusInfo(): { message: string; color: string } {
    const min = this.formData().minStock;
    const max = this.formData().maxStock;
    const reorder = this.formData().reorderPoint;

    if (min === 0 && max === 0) {
      return { message: 'Configure los valores de stock', color: 'text-slate-500' };
    }
    if (reorder >= min) {
      return { message: 'El punto de reorden debe ser menor al stock mínimo', color: 'text-red-600' };
    }
    if (min > max) {
      return { message: 'El stock mínimo no puede ser mayor al máximo', color: 'text-red-600' };
    }
    return { message: 'Configuración válida', color: 'text-green-600' };
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }
}
