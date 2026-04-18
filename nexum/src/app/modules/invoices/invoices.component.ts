import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { InvoicesService, Invoice, InvoiceFilters } from '../../core/services/invoices.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
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

  // Signals
  invoices = signal<Invoice[]>([]);
  isLoading = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // UI state
  currentPage = signal(1);
  pageSize = 10;
  searchTerm = signal('');
  statusFilter = signal('');
  isCreateOpen = signal(false);

  // Computed
  filteredInvoices = computed(() => {
    let filtered = this.invoices();

    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(inv =>
        inv.customerName.toLowerCase().includes(term) ||
        inv.invoiceNumber.toLowerCase().includes(term)
      );
    }

    if (this.statusFilter()) {
      filtered = filtered.filter(inv => inv.status === this.statusFilter());
    }

    return filtered;
  });

  pagedInvoices = computed(() => {
    const filtered = this.filteredInvoices();
    const start = (this.currentPage() - 1) * this.pageSize;
    const end = start + this.pageSize;
    return filtered.slice(start, end);
  });

  paginationConfig = computed(() => ({
    currentPage: this.currentPage(),
    totalPages: Math.ceil(this.filteredInvoices().length / this.pageSize) || 1,
    totalItems: this.filteredInvoices().length,
    pageSize: this.pageSize,
    itemsPerPage: this.pageSize
  }));

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
      status: this.statusFilter() || undefined
    };

    this.invoicesService.getInvoices(filters).subscribe({
      next: (data: Invoice[]) => {
        this.invoices.set(data);
        this.currentPage.set(1);
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
  }

  resetFilters() {
    this.searchTerm.set('');
    this.statusFilter.set('');
    this.currentPage.set(1);
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
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

    this.invoicesService.deleteInvoice(invoice.id).subscribe({
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
