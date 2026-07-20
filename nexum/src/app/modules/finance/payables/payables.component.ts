import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FinanceService } from '../../../core/services/finance.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PaginationComponent, PaginationConfig } from '../../../shared/components/pagination/pagination.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-payables',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, ModalComponent],
  templateUrl: './payables.component.html',
})
export class PayablesComponent implements OnInit, OnDestroy {
  private financeService = inject(FinanceService);
  private notificationService = inject(NotificationService);

  items = signal<any[]>([]);
  stats = signal<any>(null);
  totalPaid = computed(() => this.items().reduce((sum, ap) => sum + Number(ap.paidAmount || 0), 0));
  isLoading = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  searchTerm = signal('');
  statusFilter = signal('');
  agingFilter = signal('');
  currentPage = signal(1);
  pageSize = 20;

  isCreateOpen = signal(false);
  isEditOpen = signal(false);
  isPaymentOpen = signal(false);
  selectedPayable = signal<any>(null);
  formError = signal('');

  newPayable: any = { supplierName: '', supplierId: '', originalAmount: 0, dueDate: '', description: '' };
  editPayable: any = {};
  paymentData: any = {};
  bankAccounts = signal<any[]>([]);

  private refreshSub!: Subscription;
  private toastSub!: Subscription;

  filteredItems = computed(() => {
    let list = this.items();
    const term = this.searchTerm().toLowerCase();
    if (term) {
      list = list.filter(ap =>
        ap.supplierName?.toLowerCase().includes(term) ||
        ap.apNumber?.toLowerCase().includes(term) ||
        ap.supplierId?.toLowerCase().includes(term)
      );
    }
    const status = this.statusFilter();
    if (status) list = list.filter(ap => ap.status === status);
    const aging = this.agingFilter();
    if (aging) list = list.filter(ap => ap.agingCategory === aging);
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
    this.loadBankAccounts();
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
    this.financeService.getPayables().subscribe({
      next: (data: any) => {
        this.items.set(Array.isArray(data) ? data : (data?.data ?? data?.items ?? []));
        this.currentPage.set(1);
        this.isLoading.set(false);
      },
      error: () => { this.hasError.set(true); this.isLoading.set(false); },
    });
  }

  loadStats(): void {
    this.financeService.getPayableStats().subscribe({
      next: (s: any) => this.stats.set(s),
      error: () => {},
    });
  }

  loadBankAccounts(): void {
    this.financeService.getBanks().subscribe({
      next: (data: any) => {
        this.bankAccounts.set(Array.isArray(data) ? data : (data?.data ?? data?.items ?? []));
      },
      error: () => {},
    });
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  onFilterChange(): void {
    this.currentPage.set(1);
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  openCreate(): void {
    this.newPayable = { supplierName: '', supplierId: '', originalAmount: 0, dueDate: '', description: '' };
    this.formError.set('');
    this.isCreateOpen.set(true);
  }

  closeCreate(): void {
    this.isCreateOpen.set(false);
    this.formError.set('');
  }

  savePayable(): void {
    if (!this.newPayable.supplierName?.trim() || !this.newPayable.originalAmount || !this.newPayable.dueDate) {
      this.formError.set('Proveedor, monto y fecha de vencimiento son obligatorios');
      return;
    }
    this.formError.set('');
    this.financeService.createPayable(this.newPayable).subscribe({
      next: () => {
        this.closeCreate();
        this.loadData();
        this.loadStats();
        this.showToast('Cuenta por pagar creada exitosamente', 'success');
      },
      error: (err: any) => this.formError.set(err?.error?.message || 'Error al crear cuenta por pagar'),
    });
  }

  openEdit(payable: any): void {
    this.selectedPayable.set(payable);
    this.editPayable = { ...payable };
    this.formError.set('');
    this.isEditOpen.set(true);
  }

  closeEdit(): void {
    this.isEditOpen.set(false);
    this.selectedPayable.set(null);
    this.formError.set('');
  }

  updatePayable(): void {
    if (!this.editPayable.supplierName?.trim()) {
      this.formError.set('Proveedor es obligatorio');
      return;
    }
    this.formError.set('');
    this.financeService.updatePayable(this.selectedPayable()!.id, this.editPayable).subscribe({
      next: () => {
        this.closeEdit();
        this.loadData();
        this.showToast('Cuenta por pagar actualizada exitosamente', 'success');
      },
      error: (err: any) => this.formError.set(err?.error?.message || 'Error al actualizar cuenta por pagar'),
    });
  }

  openPaymentModal(payable: any): void {
    this.selectedPayable.set(payable);
    this.paymentData = {
      amount: payable.balanceAmount,
      paymentMethod: 'bank_transfer',
      bankAccountId: '',
      paymentDate: new Date().toISOString().split('T')[0],
      description: `Liquidación ${payable.apNumber} - ${payable.supplierName}`,
    };
    this.formError.set('');
    this.isPaymentOpen.set(true);
  }

  closePaymentModal(): void {
    this.isPaymentOpen.set(false);
    this.selectedPayable.set(null);
    this.formError.set('');
  }

  processPayment(): void {
    const ap = this.selectedPayable();
    if (!ap) return;
    const data = this.paymentData;
    if (!data.amount || Number(data.amount) <= 0) {
      this.formError.set('El monto a pagar debe ser mayor que cero');
      return;
    }
    if ((data.paymentMethod === 'bank_transfer' || data.paymentMethod === 'check' ||
         data.paymentMethod === 'credit_card' || data.paymentMethod === 'debit_card') && !data.bankAccountId) {
      this.formError.set('Seleccione una cuenta bancaria para este método de pago');
      return;
    }
    this.formError.set('');
    this.financeService.createPayment({
      paymentType: 'payable',
      accountPayableId: ap.id,
      amount: Number(data.amount),
      paymentMethod: data.paymentMethod,
      bankAccountId: data.bankAccountId || null,
      paymentDate: data.paymentDate,
      description: data.description,
      counterpartyName: ap.supplierName,
      performedBy: 'Usuario',
    }).subscribe({
      next: () => {
        this.closePaymentModal();
        this.loadData();
        this.loadStats();
        this.showToast('Cuenta por pagar liquidada exitosamente', 'success');
      },
      error: (err: any) => this.formError.set(err?.error?.message || 'Error al liquidar cuenta por pagar'),
    });
  }

  private showToast(message: string, type: 'success' | 'error' | 'info'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      partial: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return map[status] || 'bg-slate-100 text-slate-800';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = { pending: 'Pendiente', partial: 'Parcial', paid: 'Pagada', overdue: 'Vencida' };
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
