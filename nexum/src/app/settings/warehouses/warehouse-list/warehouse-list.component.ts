import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { WarehouseService } from '../../../core/services/warehouse.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ContextService } from '../../../core/services/context.service';
import { Warehouse, CreateWarehouseRequest } from '../../../core/models/warehouse.model';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { PaginationComponent, PaginationConfig } from '../../../shared/components/pagination/pagination.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-warehouse-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent, ModalComponent],
  templateUrl: './warehouse-list.component.html'
})
export class WarehouseListComponent implements OnInit, OnDestroy {
  private warehouseService = inject(WarehouseService);
  private notificationService = inject(NotificationService);
  private contextService = inject(ContextService);
  private confirmDialog = inject(ConfirmDialogService);

  warehouses = signal<Warehouse[]>([]);
  isLoading = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // UI state
  currentPage = signal(1);
  pageSize = 8;
  searchTerm = signal('');
  isCreateOpen = signal(false);
  isEditOpen = signal(false);
  selectedWarehouse = signal<Warehouse | null>(null);

  // Form data
  formData = signal<CreateWarehouseRequest>({
    name: '',
    code: '',
    address: '',
  });

  private refreshSub!: Subscription;
  private toastSub!: Subscription;

  ngOnInit(): void {
    this.loadWarehouses();
    this.refreshSub = this.notificationService.refresh$.subscribe(() => this.loadWarehouses());
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

  loadWarehouses(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    
    this.warehouseService.getWarehouses(this.currentCompanyId).subscribe({
      next: (data) => {
        this.warehouses.set(data);
        this.currentPage.set(1);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
        this.showToast('Error al cargar los almacenes', 'error');
      }
    });
  }

  get filteredWarehouses(): Warehouse[] {
    const search = this.searchTerm().toLowerCase();
    if (!search) return this.warehouses();
    return this.warehouses().filter(w =>
      w.name.toLowerCase().includes(search) ||
      w.code.toLowerCase().includes(search) ||
      w.address?.toLowerCase().includes(search)
    );
  }

  get pagedWarehouses(): Warehouse[] {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredWarehouses.slice(start, start + this.pageSize);
  }

  get paginationConfig(): PaginationConfig {
    const total = this.filteredWarehouses.length;
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

  openCreate(): void {
    this.formData.set({
      name: '',
      code: '',
      address: '',
    });
    this.isCreateOpen.set(true);
  }

  closeCreate(): void {
    this.isCreateOpen.set(false);
  }

  openEdit(warehouse: Warehouse): void {
    this.selectedWarehouse.set(warehouse);
    this.formData.set({
      name: warehouse.name,
      code: warehouse.code,
      address: warehouse.address ?? '',
    });
    this.isEditOpen.set(true);
  }

  closeEdit(): void {
    this.isEditOpen.set(false);
    this.selectedWarehouse.set(null);
  }

  createWarehouse(): void {
    const data = this.formData();
    if (!data.name?.trim()) {
      this.showToast('El nombre del almacén es obligatorio', 'error');
      return;
    }
    if (!data.code?.trim()) {
      this.showToast('El código del almacén es obligatorio', 'error');
      return;
    }
    
    this.warehouseService.createWarehouse(data).subscribe({
      next: () => {
        this.showToast('Almacén creado exitosamente', 'success');
        this.closeCreate();
        this.loadWarehouses();
      },
      error: () => this.showToast('Error al crear el almacén', 'error')
    });
  }

  updateWarehouse(): void {
    const data = this.formData();
    const id = this.selectedWarehouse()!.id;
    if (!data.name?.trim()) {
      this.showToast('El nombre del almacén es obligatorio', 'error');
      return;
    }
    
    this.warehouseService.updateWarehouse(id, data).subscribe({
      next: () => {
        this.showToast('Almacén actualizado exitosamente', 'success');
        this.closeEdit();
        this.loadWarehouses();
      },
      error: () => this.showToast('Error al actualizar el almacén', 'error')
    });
  }

  async deleteWarehouse(warehouse: Warehouse): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar almacén',
      message: `¿Está seguro de eliminar el almacén "${warehouse.name}"?`,
      confirmText: 'Eliminar',
      type: 'danger'
    });
    if (!confirmed) return;
    this.warehouseService.deleteWarehouse(warehouse.id).subscribe({
      next: () => {
        this.showToast('Almacén eliminado exitosamente', 'success');
        this.loadWarehouses();
      },
      error: () => this.showToast('Error al eliminar el almacén', 'error')
    });
  }

  async toggleWarehouseStatus(warehouse: Warehouse): Promise<void> {
    const action = warehouse.isActive ? 'deactivateWarehouse' : 'activateWarehouse';
    const message = warehouse.isActive 
      ? '¿Está seguro de desactivar este almacén?' 
      : '¿Está seguro de activar este almacén?';
    
    const confirmed = await this.confirmDialog.confirm({
      title: warehouse.isActive ? 'Desactivar almacén' : 'Activar almacén',
      message,
      confirmText: warehouse.isActive ? 'Desactivar' : 'Activar',
      type: 'warning'
    });
    if (!confirmed) return;
    
    this.warehouseService[action](warehouse.id).subscribe({
      next: () => {
        this.showToast(
          warehouse.isActive ? 'Almacén desactivado' : 'Almacén activado',
          'success'
        );
        this.loadWarehouses();
      },
      error: () => this.showToast('Error al cambiar estado del almacén', 'error')
    });
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES');
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }
}