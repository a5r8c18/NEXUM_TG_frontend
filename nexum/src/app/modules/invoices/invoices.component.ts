import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { InvoicesService, Invoice, InvoiceFilters, PaginationResult } from '../../core/services/invoices.service';
import { FinanceService } from '../../core/services/finance.service';
import { ProductsService } from '../../core/services/products.service';
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
  private financeService = inject(FinanceService);
  private productsService = inject(ProductsService);
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

  // ── Modal crear factura ──
  customers = signal<any[]>([]);
  products = signal<any[]>([]);
  productDropIndex = signal<number | null>(null);
  customerQuery = '';
  customerDrop = signal(false);
  saving = signal(false);
  formError = signal('');
  invoiceForm: any = this.emptyInvoiceForm();
  invoiceItems = signal<any[]>([]);

  private emptyInvoiceForm() {
    return {
      customerId: '',
      customerName: '',
      customerAddress: '',
      customerPhone: '',
      date: new Date().toISOString().split('T')[0],
      taxRate: 0,
      discount: 0,
      notes: '',
    };
  }

  invoiceSubtotal = computed(() =>
    this.invoiceItems().reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0));
  // El impuesto se calcula sobre el subtotal menos descuento, igual que el backend.
  invoiceTax = computed(() => Math.max(0, this.invoiceSubtotal() - Number(this.invoiceForm.discount || 0)) * (Number(this.invoiceForm.taxRate) / 100));
  invoiceTotal = computed(() => this.invoiceSubtotal() - Number(this.invoiceForm.discount || 0) + this.invoiceTax());

  filteredCustomers(query: string): any[] {
    const q = (query || '').toLowerCase();
    const list = this.customers();
    return q
      ? list.filter(c => c.name?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q) || c.taxId?.includes(q))
      : list;
  }

  selectCustomer(c: any): void {
    this.invoiceForm.customerId = c.id;
    this.invoiceForm.customerName = c.name;
    this.invoiceForm.customerAddress = c.address || '';
    this.invoiceForm.customerPhone = c.phone || '';
    this.customerQuery = c.name;
    this.customerDrop.set(false);
  }

  onCustomerBlur(): void { setTimeout(() => this.customerDrop.set(false), 150); }

  createCustomerInline(): void {
    const name = this.customerQuery.trim();
    if (!name) return;
    this.financeService.createCustomer({ name }).subscribe({
      next: (created: any) => {
        this.customers.set([...this.customers(), created]);
        this.selectCustomer(created);
      },
      error: () => this.showToast('Error al crear cliente', 'error'),
    });
  }

  filteredProducts(term: string): any[] {
    const q = (term || '').toLowerCase();
    const list = this.products();
    return (q
      ? list.filter(p => p.productName?.toLowerCase().includes(q) || p.productCode?.toLowerCase().includes(q))
      : list).slice(0, 10);
  }

  selectProduct(item: any, p: any): void {
    item.productCode = p.productCode;
    item.description = p.productName;
    item.unitPrice = Number(p.defaultUnitPrice || 0);
    this.productDropIndex.set(null);
  }

  onProductBlur(): void {
    setTimeout(() => this.productDropIndex.set(null), 150);
  }

  addItem(): void {
    this.invoiceItems.set([...this.invoiceItems(), { description: '', quantity: 1, unitPrice: 0 }]);
  }

  removeItem(index: number): void {
    const items = [...this.invoiceItems()];
    items.splice(index, 1);
    this.invoiceItems.set(items);
  }

  itemAmount(item: any): number {
    return Number(item.quantity || 0) * Number(item.unitPrice || 0);
  }

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
    this.invoiceForm = this.emptyInvoiceForm();
    this.invoiceItems.set([]);
    this.customerQuery = '';
    this.formError.set('');
    this.financeService.getCustomers().subscribe({
      next: (data: any[]) => this.customers.set(data),
      error: () => {},
    });
    this.productsService.getAll({ isActive: true }).subscribe({
      next: (data: any) => this.products.set(Array.isArray(data) ? data : (data?.data ?? data?.items ?? [])),
      error: () => {},
    });
    this.addItem();
    this.isCreateOpen.set(true);
  }

  closeCreate(): void {
    this.isCreateOpen.set(false);
  }

  createInvoice(): void {
    if (!this.invoiceForm.customerName?.trim()) {
      this.formError.set('Seleccione un cliente');
      return;
    }
    const items = this.invoiceItems().filter(i => i.description?.trim() && Number(i.quantity) > 0);
    if (!items.length) {
      this.formError.set('Añada al menos una línea con descripción y cantidad');
      return;
    }
    this.formError.set('');
    this.saving.set(true);
    this.invoicesService.createInvoice({
      customerName: this.invoiceForm.customerName.trim(),
      customerId: this.invoiceForm.customerId || undefined,
      customerAddress: this.invoiceForm.customerAddress || undefined,
      customerPhone: this.invoiceForm.customerPhone || undefined,
      date: this.invoiceForm.date,
      taxRate: Number(this.invoiceForm.taxRate) || 0,
      discount: Number(this.invoiceForm.discount) || 0,
      notes: this.invoiceForm.notes || undefined,
      items: items.map(i => ({
        productCode: i.productCode || undefined,
        description: i.description.trim(),
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
      })),
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeCreate();
        this.showToast('Factura creada', 'success');
        this.loadInvoices();
      },
      error: (err: any) => {
        this.saving.set(false);
        this.formError.set(err?.error?.message || 'Error al crear factura');
      },
    });
  }

  private showToast(message: string, type: 'success' | 'error' | 'info'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }
}
