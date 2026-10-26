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

  // ── Modal Ver detalle de factura ──
  isViewOpen = signal(false);
  viewLoading = signal(false);
  viewInvoice = signal<any>(null);

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

  isCustomerModalOpen = signal(false);
  newCustomerForm: any = this.emptyCustomerForm();

  private emptyCustomerForm() {
    return { reeupCode: '', name: '', abbreviation: '', address: '', email: '', phone: '', taxId: '', ircc: '', province: '', country: 'Cuba' };
  }

  createCustomerInline(): void {
    this.newCustomerForm = this.emptyCustomerForm();
    this.newCustomerForm.name = this.customerQuery.trim();
    this.customerDrop.set(false);
    this.isCustomerModalOpen.set(true);
  }

  saveCustomerInline(): void {
    if (!this.newCustomerForm.name?.trim()) return;
    this.financeService.createCustomer(this.newCustomerForm).subscribe({
      next: (created: any) => {
        this.customers.set([...this.customers(), created]);
        this.selectCustomer(created);
        this.isCustomerModalOpen.set(false);
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

  onProductInput(item: any, index: number, value: string): void {
    item.description = value;
    item.productCode = undefined;
    item.productQuery = value;
    this.productDropIndex.set(index);
  }

  selectProduct(item: any, p: any): void {
    item.productCode = p.productCode;
    item.description = p.productName;
    item.productQuery = p.productName;
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

  filteredInvoices = computed(() => this.invoices());
  pagedInvoices = computed(() => this.invoices());

  paginationConfig = computed(() => {
    const pagination = this.paginationData();
    if (!pagination) {
      return { currentPage: 1, totalPages: 1, totalItems: 0, pageSize: this.pageSize, itemsPerPage: this.pageSize };
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
    this.productsService.getAll().subscribe({
      next: (data: any) => this.products.set(Array.isArray(data) ? data : (data?.data ?? data?.items ?? data?.products ?? [])),
      error: () => {},
    });
  }

  ngOnDestroy() {}

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

  applyFilters() { this.currentPage.set(1); this.loadInvoices(); }
  resetFilters() { this.searchTerm.set(''); this.statusFilter.set(''); this.currentPage.set(1); this.loadInvoices(); }
  onPageChange(page: number) { this.currentPage.set(page); this.loadInvoices(); }

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

  // ── Ver detalle (modal) ──
  openView(invoice: Invoice): void {
    this.viewInvoice.set(null);
    this.isViewOpen.set(true);
    this.viewLoading.set(true);

    this.invoicesService.getInvoiceWithVouchers(invoice.id).subscribe({
      next: (data: any) => {
        this.viewInvoice.set({
          ...(data.invoice ?? data),
          vouchers: data.vouchers || [],
        });
        this.viewLoading.set(false);
      },
      error: () => {
        this.viewLoading.set(false);
        this.isViewOpen.set(false);
        this.showToast('Error al cargar el detalle', 'error');
      }
    });
  }

  closeView(): void {
    this.isViewOpen.set(false);
    this.viewInvoice.set(null);
  }

  // ── PDF cliente-side (marca de agua MIDAS, NIT del cliente) ──
  downloadPDF(invoice: Invoice) {
    this.invoicesService.getInvoiceById(invoice.id).subscribe({
      next: (data: any) => {
        const inv = data?.invoice ?? data;
        this.generateInvoicePDF(inv);
      },
      error: () => this.showToast('Error al generar PDF', 'error')
    });
  }

  private generateInvoicePDF(invoice: any) {
    const items = invoice.items || [];
    const itemsHtml = items.length
      ? items.map((i: any) => `
          <tr>
            <td>${i.productCode || '-'}</td>
            <td>${i.description || ''}</td>
            <td style="text-align:center">${i.quantity}</td>
            <td style="text-align:right">$${Number(i.unitPrice || 0).toFixed(2)}</td>
            <td style="text-align:right">$${Number(i.amount || 0).toFixed(2)}</td>
          </tr>`).join('')
      : '<tr><td colspan="5" style="text-align:center;color:#666;">Sin líneas</td></tr>';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Factura ${invoice.invoiceNumber}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; padding: 20px; margin: 0; color: #000; }
        h1 { text-align: center; font-size: 18px; margin: 0 0 4px; font-weight: bold; letter-spacing: 1px; }
        h2 { text-align: center; font-size: 12px; margin: 0 0 20px; font-weight: normal; color: #555; }
        .header-box { border: 1px solid #333; padding: 10px 12px; margin-bottom: 15px; border-radius: 3px; }
        .header-row { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 6px; }
        .header-row:last-child { margin-bottom: 0; }
        .header-field { flex: 1; }
        .header-label { font-weight: bold; color: #333; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        th, td { border: 1px solid #333; padding: 5px 6px; font-size: 10px; }
        th { background: #f0f0f0; text-align: center; font-weight: bold; }
        .total-section { margin-left: auto; width: 260px; }
        .total-line { display: flex; justify-content: space-between; padding: 3px 0; }
        .total-line.total { font-size: 14px; font-weight: bold; border-top: 1px solid #333; margin-top: 5px; padding-top: 6px; }
        .notes { margin-top: 20px; padding-top: 10px; border-top: 1px dashed #666; font-size: 10px; }
        .signatures { display: flex; justify-content: space-around; margin-top: 60px; gap: 30px; }
        .signature-box { flex: 1; text-align: center; }
        .signature-line { border-bottom: 1px solid #000; height: 40px; margin-bottom: 5px; }
        .signature-label { font-size: 10px; }
        .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #888; }
      </style>
    </head><body>
      <h1>FACTURA</h1>
      <h2>N° ${invoice.invoiceNumber}</h2>

      <div class="header-box">
        <div class="header-row">
          <div class="header-field"><span class="header-label">Cliente:</span> ${invoice.customerName || '-'}</div>
          <div class="header-field"><span class="header-label">NIT:</span> ${invoice.customerNit || '-'}</div>
        </div>
        <div class="header-row">
          <div class="header-field"><span class="header-label">Fecha:</span> ${this.formatDate(invoice.date)}</div>
          <div class="header-field"><span class="header-label">Estado:</span> ${this.getStatusLabel(invoice.status)}</div>
        </div>
        ${invoice.customerAddress ? `<div class="header-row"><div class="header-field"><span class="header-label">Dirección:</span> ${invoice.customerAddress}</div></div>` : ''}
        ${invoice.customerPhone ? `<div class="header-row"><div class="header-field"><span class="header-label">Teléfono:</span> ${invoice.customerPhone}</div></div>` : ''}
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:80px;">Código</th>
            <th>Descripción</th>
            <th style="width:60px;">Cant.</th>
            <th style="width:90px;">P. Unit.</th>
            <th style="width:100px;">Importe</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <div class="total-section">
        <div class="total-line"><span>Subtotal:</span><span>$${Number(invoice.subtotal || 0).toFixed(2)}</span></div>
        <div class="total-line"><span>Descuento:</span><span>-$${Number(invoice.discount || 0).toFixed(2)}</span></div>
        <div class="total-line"><span>Impuesto (${Number(invoice.taxRate || 0)}%):</span><span>$${Number(invoice.taxAmount || 0).toFixed(2)}</span></div>
        <div class="total-line total"><span>TOTAL:</span><span>$${Number(invoice.total || 0).toFixed(2)}</span></div>
      </div>

      ${invoice.notes ? `<div class="notes"><strong>Notas:</strong> ${invoice.notes}</div>` : ''}

      <div class="signatures">
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">Firma del Vendedor</div>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">Firma del Cliente</div>
        </div>
      </div>

      <div class="footer">Documento generado automáticamente por MIDAS</div>

      <script>window.onload = function() { window.print(); }</script>
    </body></html>`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.showToast('No se pudo abrir ventana de impresión', 'error');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
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

  formatCurrency(value: number | undefined): string {
    if (!value) return '$0.00';
    return new Intl.NumberFormat('es-CU', { style: 'currency', currency: 'CUP' }).format(value);
  }

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

  closeCreate(): void { this.isCreateOpen.set(false); }

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