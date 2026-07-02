import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SuppliersService } from '../../../core/services/suppliers.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { PaginationComponent, PaginationConfig } from '../../../shared/components/pagination/pagination.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, ModalComponent],
  templateUrl: './suppliers.component.html',
})
export class SuppliersComponent implements OnInit, OnDestroy {
  private suppliersService = inject(SuppliersService);
  private notificationService = inject(NotificationService);
  private confirmDialog = inject(ConfirmDialogService);

  items = signal<any[]>([]);
  stats = signal<any>(null);
  isLoading = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  searchTerm = signal('');
  activeFilter = signal('');
  currentPage = signal(1);
  pageSize = 20;

  isCreateOpen = signal(false);
  isEditOpen = signal(false);
  selectedSupplier = signal<any>(null);
  formError = signal('');

  newSupplier: any = { supplierCode: '', businessName: '', tradeName: '', nit: '', contactPerson: '', contactPhone: '', contactEmail: '', address: '', city: '' };
  editSupplier: any = {};

  private refreshSub!: Subscription;
  private toastSub!: Subscription;

  filteredItems = computed(() => {
    let list = this.items();
    const term = this.searchTerm().toLowerCase();
    if (term) {
      list = list.filter(s =>
        s.supplierCode?.toLowerCase().includes(term) ||
        s.businessName?.toLowerCase().includes(term) ||
        s.nit?.toLowerCase().includes(term) ||
        s.tradeName?.toLowerCase().includes(term)
      );
    }
    const active = this.activeFilter();
    if (active !== '') list = list.filter(s => s.isActive === (active === 'true'));
    return list;
  });

  pagedItems = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredItems().slice(start, start + this.pageSize);
  });

  paginationConfig = computed<PaginationConfig>(() => ({
    currentPage: this.currentPage(),
    totalItems: this.filteredItems().length,
    pageSize: this.pageSize,
    totalPages: Math.ceil(this.filteredItems().length / this.pageSize),
    itemsPerPage: this.pageSize,
  }));

  ngOnInit(): void {
    this.loadData();
    this.loadStats();
    this.refreshSub = this.notificationService.refresh$.subscribe(() => {
      this.loadData();
      this.loadStats();
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

  loadData(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.suppliersService.getAll().subscribe({
      next: (data: any) => {
        this.items.set(Array.isArray(data) ? data : (data?.data ?? data?.items ?? []));
        this.currentPage.set(1);
        this.isLoading.set(false);
      },
      error: () => { this.hasError.set(true); this.isLoading.set(false); },
    });
  }

  loadStats(): void {
    this.suppliersService.getStatistics().subscribe({
      next: (s: any) => this.stats.set(s),
      error: () => {},
    });
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  onActiveChange(event: Event): void {
    this.activeFilter.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  openCreate(): void {
    this.newSupplier = { supplierCode: '', businessName: '', tradeName: '', nit: '', contactPerson: '', contactPhone: '', contactEmail: '', address: '', city: '' };
    this.formError.set('');
    this.isCreateOpen.set(true);
  }

  closeCreate(): void {
    this.isCreateOpen.set(false);
    this.formError.set('');
  }

  saveSupplier(): void {
    if (!this.newSupplier.supplierCode?.trim() || !this.newSupplier.businessName?.trim()) {
      this.formError.set('Codigo y razon social son obligatorios');
      return;
    }
    this.formError.set('');
    this.suppliersService.create(this.newSupplier).subscribe({
      next: () => {
        this.closeCreate();
        this.loadData();
        this.loadStats();
        this.showToast('Proveedor creado exitosamente', 'success');
      },
      error: (err: any) => this.formError.set(err?.error?.message || 'Error al crear proveedor'),
    });
  }

  openEdit(supplier: any): void {
    this.selectedSupplier.set(supplier);
    this.editSupplier = { ...supplier };
    this.formError.set('');
    this.isEditOpen.set(true);
  }

  closeEdit(): void {
    this.isEditOpen.set(false);
    this.selectedSupplier.set(null);
    this.formError.set('');
  }

  updateSupplier(): void {
    if (!this.editSupplier.supplierCode?.trim() || !this.editSupplier.businessName?.trim()) {
      this.formError.set('Codigo y razon social son obligatorios');
      return;
    }
    this.formError.set('');
    this.suppliersService.update(this.selectedSupplier()!.id, this.editSupplier).subscribe({
      next: () => {
        this.closeEdit();
        this.loadData();
        this.showToast('Proveedor actualizado exitosamente', 'success');
      },
      error: (err: any) => this.formError.set(err?.error?.message || 'Error al actualizar proveedor'),
    });
  }

  async deactivate(supplier: any): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Desactivar proveedor',
      message: `Desactivar "${supplier.businessName}"?`,
      confirmText: 'Desactivar',
      type: 'warning',
    });
    if (!confirmed) return;
    this.suppliersService.deactivate(supplier.id).subscribe({
      next: () => { this.loadData(); this.showToast('Proveedor desactivado', 'success'); },
      error: () => this.showToast('Error al desactivar proveedor', 'error'),
    });
  }

  private showToast(message: string, type: 'success' | 'error' | 'info'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }
}
