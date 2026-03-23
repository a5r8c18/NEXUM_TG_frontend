import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, Params } from '@angular/router';
import { Subscription } from 'rxjs';
import { WarehouseService } from '../../../../../core/services/warehouse.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { ContextService } from '../../../../../core/services/context.service';
import { Warehouse, CreateWarehouseRequest, UpdateWarehouseRequest } from '../../../../../core/models/warehouse.model';

@Component({
  selector: 'app-warehouse-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './warehouse-form.component.html'
})
export class WarehouseFormComponent implements OnInit, OnDestroy {
  private warehouseService = inject(WarehouseService);
  private notificationService = inject(NotificationService);
  private contextService = inject(ContextService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isLoading = signal(false);
  isEdit = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Form data
  formData = signal<CreateWarehouseRequest>({
    name: '',
    code: '',
    address: '',
  });

  warehouseId = signal<string | null>(null);
  errorMessage = signal('');

  private routeSub!: Subscription;
  private toastSub!: Subscription;

  ngOnInit(): void {
    this.routeSub = this.route.params.subscribe((params: Params) => {
      const id = params['id'];
      if (id) {
        this.warehouseId.set(id);
        this.isEdit.set(true);
        this.loadWarehouse(id);
      }
    });

    this.toastSub = this.notificationService.toasts$.subscribe(t => {
      this.toast.set(t);
      setTimeout(() => this.toast.set(null), 4000);
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.toastSub?.unsubscribe();
  }

  get currentCompanyId(): string | undefined {
    return this.contextService.currentCompany()?.id;
  }

  loadWarehouse(id: string): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    
    this.warehouseService.getWarehouse(id).subscribe({
      next: (warehouse: Warehouse) => {
        this.formData.set({
          name: warehouse.name,
          code: warehouse.code,
          address: warehouse.address ?? '',
        });
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
        this.errorMessage.set('Error al cargar el almacén');
        this.showToast('Error al cargar el almacén', 'error');
      }
    });
  }

  onSubmit(): void {
    this.errorMessage.set('');
    
    // Validaciones
    if (!this.formData().name?.trim()) {
      this.errorMessage.set('El nombre del almacén es obligatorio');
      return;
    }
    if (!this.formData().code?.trim()) {
      this.errorMessage.set('El código del almacén es obligatorio');
      return;
    }

    this.isLoading.set(true);

    if (this.isEdit()) {
      this.updateWarehouse();
    } else {
      this.createWarehouse();
    }
  }

  createWarehouse(): void {
    const data = this.formData();
    
    this.warehouseService.createWarehouse(data).subscribe({
      next: () => {
        this.showToast('Almacén creado exitosamente', 'success');
        this.router.navigate(['/inventory/warehouses']);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Error al crear el almacén');
        this.showToast('Error al crear el almacén', 'error');
      }
    });
  }

  updateWarehouse(): void {
    const data = this.formData() as UpdateWarehouseRequest;
    const id = this.warehouseId()!;
    
    this.warehouseService.updateWarehouse(id, data).subscribe({
      next: () => {
        this.showToast('Almacén actualizado exitosamente', 'success');
        this.router.navigate(['/inventory/warehouses']);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Error al actualizar el almacén');
        this.showToast('Error al actualizar el almacén', 'error');
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/inventory/warehouses']);
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }
}