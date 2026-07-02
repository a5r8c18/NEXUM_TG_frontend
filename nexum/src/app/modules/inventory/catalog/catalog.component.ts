import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ProductsService } from '../../../core/services/products.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { PaginationComponent, PaginationConfig } from '../../../shared/components/pagination/pagination.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, PaginationComponent, ModalComponent],
  templateUrl: './catalog.component.html',
})
export class CatalogComponent implements OnInit, OnDestroy {
  private productsService = inject(ProductsService);
  private notificationService = inject(NotificationService);
  private confirmDialog = inject(ConfirmDialogService);

  products = signal<any[]>([]);
  stats = signal<any>(null);
  isLoading = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Filters
  searchTerm = signal('');
  categoryFilter = signal('');
  activeFilter = signal('');
  currentPage = signal(1);
  pageSize = 20;

  // Modal state
  isCreateOpen = signal(false);
  isEditOpen = signal(false);
  selectedProduct = signal<any>(null);
  formError = signal('');

  newProduct: any = { productCode: '', productName: '', productDescription: '', category: '', productUnit: '', cpcuCode: '', defaultUnitPrice: null };
  editProduct: any = {};

  private refreshSub!: Subscription;
  private toastSub!: Subscription;

  filteredProducts = computed(() => {
    let list = this.products();
    const term = this.searchTerm().toLowerCase();
    if (term) {
      list = list.filter(p =>
        p.productCode?.toLowerCase().includes(term) ||
        p.productName?.toLowerCase().includes(term) ||
        (p.cpcuCode && p.cpcuCode.toLowerCase().includes(term))
      );
    }
    const cat = this.categoryFilter();
    if (cat) list = list.filter(p => p.category === cat);
    const active = this.activeFilter();
    if (active !== '') list = list.filter(p => p.isActive === (active === 'true'));
    return list;
  });

  pagedProducts = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredProducts().slice(start, start + this.pageSize);
  });

  paginationConfig = computed<PaginationConfig>(() => ({
    currentPage: this.currentPage(),
    totalItems: this.filteredProducts().length,
    pageSize: this.pageSize,
    totalPages: Math.ceil(this.filteredProducts().length / this.pageSize),
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
    this.productsService.getAll().subscribe({
      next: (data: any) => {
        this.products.set(Array.isArray(data) ? data : (data?.data ?? data?.items ?? []));
        this.currentPage.set(1);
        this.isLoading.set(false);
      },
      error: () => { this.hasError.set(true); this.isLoading.set(false); },
    });
  }

  loadStats(): void {
    this.productsService.getStatistics().subscribe({
      next: (s: any) => this.stats.set(s),
      error: () => {},
    });
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  onCategoryChange(event: Event): void {
    this.categoryFilter.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onActiveChange(event: Event): void {
    this.activeFilter.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  openCreate(): void {
    this.newProduct = { productCode: '', productName: '', productDescription: '', category: '', productUnit: '', cpcuCode: '', defaultUnitPrice: null };
    this.formError.set('');
    this.isCreateOpen.set(true);
  }

  closeCreate(): void {
    this.isCreateOpen.set(false);
    this.formError.set('');
  }

  saveProduct(): void {
    if (!this.newProduct.productCode?.trim() || !this.newProduct.productName?.trim()) {
      this.formError.set('Código y nombre son obligatorios');
      return;
    }
    this.formError.set('');
    this.productsService.create(this.newProduct).subscribe({
      next: () => {
        this.closeCreate();
        this.loadData();
        this.loadStats();
        this.showToast('Producto creado exitosamente', 'success');
      },
      error: (err: any) => this.formError.set(err?.error?.message || 'Error al crear producto'),
    });
  }

  openEdit(product: any): void {
    this.selectedProduct.set(product);
    this.editProduct = { ...product };
    this.formError.set('');
    this.isEditOpen.set(true);
  }

  closeEdit(): void {
    this.isEditOpen.set(false);
    this.selectedProduct.set(null);
    this.formError.set('');
  }

  updateProduct(): void {
    if (!this.editProduct.productCode?.trim() || !this.editProduct.productName?.trim()) {
      this.formError.set('Código y nombre son obligatorios');
      return;
    }
    this.formError.set('');
    this.productsService.update(this.selectedProduct()!.id, this.editProduct).subscribe({
      next: () => {
        this.closeEdit();
        this.loadData();
        this.showToast('Producto actualizado exitosamente', 'success');
      },
      error: (err: any) => this.formError.set(err?.error?.message || 'Error al actualizar producto'),
    });
  }

  async deactivate(product: any): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Desactivar producto',
      message: `¿Desactivar "${product.productName}"?`,
      confirmText: 'Desactivar',
      type: 'warning',
    });
    if (!confirmed) return;
    this.productsService.deactivate(product.id).subscribe({
      next: () => { this.loadData(); this.showToast('Producto desactivado', 'success'); },
      error: () => this.showToast('Error al desactivar producto', 'error'),
    });
  }

  getCategoryClass(category: string): string {
    const map: Record<string, string> = {
      insumo: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      mercancia: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      produccion: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    };
    return map[category] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
  }

  getCategoryLabel(category: string): string {
    const map: Record<string, string> = { insumo: 'Insumo', mercancia: 'Mercancia', produccion: 'Produccion' };
    return map[category] || category || '-';
  }

  private showToast(message: string, type: 'success' | 'error' | 'info'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }
}
