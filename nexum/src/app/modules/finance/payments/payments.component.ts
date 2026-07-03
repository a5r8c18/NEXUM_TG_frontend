import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FinanceService } from '../../../core/services/finance.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PaginationComponent, PaginationConfig } from '../../../shared/components/pagination/pagination.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, ModalComponent],
  templateUrl: './payments.component.html',
})
export class PaymentsComponent implements OnInit, OnDestroy {
  private financeService = inject(FinanceService);
  private notificationService = inject(NotificationService);

  items = signal<any[]>([]);
  stats = signal<any>(null);
  isLoading = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  typeFilter = signal('');
  statusFilter = signal('');
  fromDate = signal('');
  toDate = signal('');
  currentPage = signal(1);
  pageSize = 20;

  isCreateOpen = signal(false);
  isDetailsOpen = signal(false);
  selectedPayment = signal<any>(null);
  formError = signal('');

  newPayment: any = { paymentType: 'receivable', amount: 0, paymentMethod: 'cash', paymentDate: '', referenceNumber: '', relatedAccountId: '', description: '' };

  private refreshSub!: Subscription;
  private toastSub!: Subscription;

  filteredItems = computed(() => {
    let list = this.items();
    const type = this.typeFilter();
    if (type) list = list.filter(p => p.paymentType === type);
    const status = this.statusFilter();
    if (status) list = list.filter(p => p.status === status);
    const from = this.fromDate();
    if (from) list = list.filter(p => p.paymentDate >= from);
    const to = this.toDate();
    if (to) list = list.filter(p => p.paymentDate <= to);
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
    this.financeService.getPayments().subscribe({
      next: (data: any) => {
        this.items.set(Array.isArray(data) ? data : (data?.data ?? data?.items ?? []));
        this.currentPage.set(1);
        this.isLoading.set(false);
      },
      error: () => { this.hasError.set(true); this.isLoading.set(false); },
    });
  }

  loadStats(): void {
    this.financeService.getPaymentStats().subscribe({
      next: (s: any) => this.stats.set(s),
      error: () => {},
    });
  }

  onFilterChange(): void {
    this.currentPage.set(1);
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  openCreate(): void {
    this.newPayment = { paymentType: 'receivable', amount: 0, paymentMethod: 'cash', paymentDate: new Date().toISOString().split('T')[0], referenceNumber: '', relatedAccountId: '', description: '' };
    this.formError.set('');
    this.isCreateOpen.set(true);
  }

  closeCreate(): void {
    this.isCreateOpen.set(false);
    this.formError.set('');
  }

  savePayment(): void {
    if (!this.newPayment.amount || !this.newPayment.paymentDate) {
      this.formError.set('Monto y fecha son obligatorios');
      return;
    }
    this.formError.set('');
    this.financeService.createPayment(this.newPayment).subscribe({
      next: () => {
        this.closeCreate();
        this.loadData();
        this.loadStats();
        this.showToast('Pago creado exitosamente', 'success');
      },
      error: (err: any) => this.formError.set(err?.error?.message || 'Error al crear pago'),
    });
  }

  viewDetails(payment: any): void {
    this.selectedPayment.set(payment);
    this.isDetailsOpen.set(true);
  }

  closeDetails(): void {
    this.isDetailsOpen.set(false);
    this.selectedPayment.set(null);
  }

  private showToast(message: string, type: 'success' | 'error' | 'info'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }

  getMethodLabel(method: string): string {
    const map: Record<string, string> = {
      cash: 'Efectivo',
      bank_transfer: 'Transferencia',
      check: 'Cheque',
      credit_card: 'Tarjeta Crédito',
      debit_card: 'Tarjeta Débito',
      other: 'Otro',
    };
    return map[method] || method;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      cancelled: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
      refunded: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    };
    return map[status] || 'bg-slate-100 text-slate-800';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      completed: 'Completado',
      pending: 'Pendiente',
      processing: 'Procesando',
      failed: 'Fallido',
      cancelled: 'Cancelado',
      refunded: 'Reembolsado',
    };
    return map[status] || status;
  }

  formatCurrency(value: number | undefined): string {
    if (!value) return '$0.00';
    return new Intl.NumberFormat('es-CU', { style: 'currency', currency: 'CUP' }).format(value);
  }

  formatDate(date: string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-CU');
  }
}
