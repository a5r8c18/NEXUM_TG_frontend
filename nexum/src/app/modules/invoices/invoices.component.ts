import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { InvoicesService, Invoice, InvoiceFilters, PaginationResult } from '../../core/services/invoices.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { OfflineFirstService } from '../../core/offline/offline-first.service';
import { signal, computed } from '@angular/core';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, ModalComponent],
  templateUrl: './invoices.component.html'
})
export class InvoicesComponent implements OnInit, OnDestroy {
  private invoicesService = inject(InvoicesService);
  private notificationService = inject(NotificationService);
  private confirmDialog = inject(ConfirmDialogService);
  private offlineFirst = inject(OfflineFirstService);

  // Signals
  invoices = signal<Invoice[]>([]);
  isLoading = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Pagination data
  paginationData = signal<PaginationResult<Invoice> | null>(null);

  // UI state
  currentPage = signal(1);
  pageSize = 10;
  searchTerm = signal('');
  statusFilter = signal('');
  isCreateOpen = signal(false);

  // Computed
  filteredInvoices = computed(() => {
    return this.invoices(); // Server-side filtering, no client-side filtering needed
  });

  pagedInvoices = computed(() => {
    return this.invoices(); // Server-side pagination, no client-side pagination needed
  });

  paginationConfig = computed(() => {
    const pagination = this.paginationData();
    if (!pagination) {
      return {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        pageSize: this.pageSize,
        itemsPerPage: this.pageSize
      };
    }
    return {
      currentPage: pagination.pagination.page,
      totalPages: pagination.pagination.totalPages,
      totalItems: pagination.pagination.total,
      pageSize: pagination.pagination.limit,
      itemsPerPage: pagination.pagination.limit
    };
  });

  ngOnInit() {
    this.loadInvoices();
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  loadInvoices() {
    this.isLoading.set(true);
    this.hasError.set(false);

    const filters: InvoiceFilters = {
      customerName: this.searchTerm() || undefined,
      status: this.statusFilter() || undefined,
      page: this.currentPage(),
      limit: this.pageSize
    };

    this.invoicesService.getInvoices(filters).subscribe({
      next: (data: PaginationResult<Invoice>) => {
        this.invoices.set(data.data);
        this.paginationData.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
        this.showToast('Error al cargar facturas', 'error');
      }
    });
  }

  applyFilters() {
    this.currentPage.set(1);
    this.loadInvoices();
  }

  resetFilters() {
    this.searchTerm.set('');
    this.statusFilter.set('');
    this.currentPage.set(1);
    this.loadInvoices();
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
    this.loadInvoices();
  }

  updateStatus(invoice: Invoice, status: 'paid' | 'cancelled') {
    this.invoicesService.updateStatus(invoice.id, status).subscribe({
      next: () => {
        this.showToast(`Factura marcada como ${this.getStatusLabel(status)}`, 'success');
        this.loadInvoices();
      },
      error: () => this.showToast('Error al actualizar estado', 'error')
    });
  }

  async deleteInvoice(invoice: Invoice) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar factura',
      message: `¿Eliminar factura ${invoice.invoiceNumber}?`,
      confirmText: 'Eliminar',
      type: 'danger'
    });
    if (!confirmed) return;

    this.offlineFirst.deleteInvoice(invoice.id).subscribe({
      next: () => {
        this.showToast('Factura eliminada', 'success');
        this.loadInvoices();
      },
      error: () => this.showToast('Error al eliminar factura', 'error')
    });
  }

  downloadPDF(invoice: Invoice) {
    this.invoicesService.downloadPDF(invoice.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `factura_${invoice.invoiceNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.showToast('PDF descargado', 'success');
      },
      error: () => this.showToast('Error al descargar PDF', 'error')
    });
  }

  downloadExcel(invoice: Invoice) {
    this.invoicesService.downloadExcel(invoice.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `factura_${invoice.invoiceNumber}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.showToast('Excel descargado', 'success');
      },
      error: () => this.showToast('Error al descargar Excel', 'error')
    });
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      pending: 'Pendiente',
      paid: 'Pagada',
      cancelled: 'Anulada'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Modal methods
  openCreate(): void {
    this.isCreateOpen.set(true);
  }

  closeCreate(): void {
    this.isCreateOpen.set(false);
  }

  createInvoice(): void {
    // TODO: Implement create invoice logic
    this.showToast('Funcionalidad de crear factura en desarrollo', 'info');
    this.closeCreate();
  }

  private showToast(message: string, type: 'success' | 'error' | 'info'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }
}
