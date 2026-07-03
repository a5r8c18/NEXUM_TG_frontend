import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { BankReconciliationService, BankReconciliation, ReconciliationStatus } from '../../../core/services/bank-reconciliation.service';
import { FinanceService } from '../../../core/services/finance.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { PaginationComponent, PaginationConfig } from '../../../shared/components/pagination/pagination.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-bank-reconciliation',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, ModalComponent],
  templateUrl: './bank-reconciliation.component.html',
})
export class BankReconciliationComponent implements OnInit, OnDestroy {
  private bankReconciliationService = inject(BankReconciliationService);
  private financeService = inject(FinanceService);
  private notificationService = inject(NotificationService);
  private confirmDialog = inject(ConfirmDialogService);

  reconciliations = signal<BankReconciliation[]>([]);
  bankAccounts = signal<any[]>([]);
  stats = signal<any>(null);
  isLoading = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  bankFilter = signal('');
  statusFilter = signal('');
  currentPage = signal(1);
  pageSize = 20;

  isCreateOpen = signal(false);
  formError = signal('');

  newRec: Partial<BankReconciliation> = {
    reconciliationDate: new Date().toISOString().split('T')[0],
    statementBalance: 0,
    bookBalance: 0,
    depositsInTransit: 0,
    outstandingChecks: 0,
    bankCharges: 0,
    interestEarned: 0,
    status: 'draft',
  };

  private refreshSub!: Subscription;
  private toastSub!: Subscription;

  filteredItems = computed(() => {
    let list = this.reconciliations();
    const bank = this.bankFilter();
    if (bank) list = list.filter(r => r.bankAccountId === bank);
    const status = this.statusFilter();
    if (status) list = list.filter(r => r.status === status);
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
    this.loadBankAccounts();
    this.loadReconciliations();
    this.refreshSub = this.notificationService.refresh$.subscribe(() => {
      this.loadBankAccounts();
      this.loadReconciliations();
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

  loadBankAccounts(): void {
    this.financeService.getBanks().subscribe({
      next: (data: any) => this.bankAccounts.set(Array.isArray(data) ? data : (data?.data ?? data?.items ?? [])),
      error: () => {},
    });
  }

  loadReconciliations(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.bankReconciliationService.findAll(this.bankFilter() || undefined).subscribe({
      next: (data) => {
        this.reconciliations.set(data);
        this.currentPage.set(1);
        this.isLoading.set(false);
      },
      error: () => { this.hasError.set(true); this.isLoading.set(false); },
    });
  }

  onFilterChange(): void {
    this.currentPage.set(1);
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  openCreate(): void {
    this.newRec = {
      reconciliationDate: new Date().toISOString().split('T')[0],
      statementBalance: 0,
      bookBalance: 0,
      depositsInTransit: 0,
      outstandingChecks: 0,
      bankCharges: 0,
      interestEarned: 0,
      status: 'draft',
    };
    this.formError.set('');
    this.isCreateOpen.set(true);
  }

  closeCreate(): void {
    this.isCreateOpen.set(false);
    this.formError.set('');
  }

  createReconciliation(): void {
    if (!this.newRec.bankAccountId || !this.newRec.reconciliationDate) {
      this.formError.set('Cuenta bancaria y fecha son obligatorios');
      return;
    }
    this.formError.set('');
    this.bankReconciliationService.create(this.newRec).subscribe({
      next: () => {
        this.closeCreate();
        this.loadReconciliations();
        this.showToast('Conciliación creada exitosamente', 'success');
      },
      error: (err: any) => this.formError.set(err?.error?.message || 'Error al crear conciliación'),
    });
  }

  async completeReconciliation(id: string): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Completar Conciliación',
      message: '¿Completar esta conciliación?',
      confirmText: 'Completar',
      type: 'warning',
    });
    if (!confirmed) return;
    this.bankReconciliationService.complete(id).subscribe({
      next: () => {
        this.loadReconciliations();
        this.showToast('Conciliación completada exitosamente', 'success');
      },
      error: () => this.showToast('Error al completar conciliación', 'error'),
    });
  }

  private showToast(message: string, type: 'success' | 'error' | 'info'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }

  getStatusClass(status: ReconciliationStatus): string {
    const classes = {
      draft: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    };
    return classes[status] || classes.draft;
  }

  getStatusLabel(status: ReconciliationStatus): string {
    const labels = {
      draft: 'Borrador',
      completed: 'Completado',
    };
    return labels[status] || status;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-CU');
  }

  formatNumber(value: number): string {
    return value.toLocaleString('es-CU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatCurrency(value: number | undefined): string {
    if (!value) return '$0.00';
    return new Intl.NumberFormat('es-CU', { style: 'currency', currency: 'CUP' }).format(value);
  }
}
