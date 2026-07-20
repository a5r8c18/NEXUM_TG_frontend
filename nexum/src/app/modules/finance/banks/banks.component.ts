import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FinanceService } from '../../../core/services/finance.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PaginationComponent, PaginationConfig } from '../../../shared/components/pagination/pagination.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-banks',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, ModalComponent],
  templateUrl: './banks.component.html',
})
export class BanksComponent implements OnInit, OnDestroy {
  private financeService = inject(FinanceService);
  private notificationService = inject(NotificationService);

  items = signal<any[]>([]);
  stats = signal<any>(null);
  isLoading = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  statusFilter = signal('');
  typeFilter = signal('');
  currentPage = signal(1);
  pageSize = 20;

  isCreateOpen = signal(false);
  isEditOpen = signal(false);
  selectedBank = signal<any>(null);
  formError = signal('');

  newBank: any = { bankName: '', accountNumber: '', accountType: 'checking', holderName: '', balance: 0, currency: 'CUP' };
  editBank: any = {};

  readonly accountTypes = [
    { value: 'checking', label: 'Cuenta Corriente' },
    { value: 'expenses', label: 'Gastos' },
    { value: 'mlc', label: 'MLC' },
  ];

  private refreshSub!: Subscription;
  private toastSub!: Subscription;

  filteredItems = computed(() => {
    let list = this.items();
    const status = this.statusFilter();
    if (status) list = list.filter(b => b.status === status);
    const type = this.typeFilter();
    if (type) list = list.filter(b => b.accountType === type);
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
    this.financeService.getBanks().subscribe({
      next: (data: any) => {
        this.items.set(Array.isArray(data) ? data : (data?.data ?? data?.items ?? []));
        this.currentPage.set(1);
        this.isLoading.set(false);
      },
      error: () => { this.hasError.set(true); this.isLoading.set(false); },
    });
  }

  loadStats(): void {
    this.financeService.getBankStats().subscribe({
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
    this.newBank = { bankName: '', accountNumber: '', accountType: 'checking', holderName: '', balance: 0, currency: 'CUP' };
    this.formError.set('');
    this.isCreateOpen.set(true);
  }

  onAccountTypeChange(bank: any): void {
    if (bank.accountType === 'mlc' && bank.currency === 'CUP') {
      bank.currency = 'USD';
    }
    if (bank.accountType !== 'mlc' && bank.currency !== 'CUP') {
      bank.currency = 'CUP';
    }
  }

  closeCreate(): void {
    this.isCreateOpen.set(false);
    this.formError.set('');
  }

  saveBank(): void {
    if (!this.newBank.bankName?.trim() || !this.newBank.accountNumber?.trim() || !this.newBank.holderName?.trim()) {
      this.formError.set('Banco, número de cuenta y titular son obligatorios');
      return;
    }
    this.formError.set('');
    this.financeService.createBank(this.newBank).subscribe({
      next: () => {
        this.closeCreate();
        this.loadData();
        this.loadStats();
        this.showToast('Cuenta bancaria creada exitosamente', 'success');
      },
      error: (err: any) => this.formError.set(err?.error?.message || 'Error al crear cuenta bancaria'),
    });
  }

  openEdit(bank: any): void {
    this.selectedBank.set(bank);
    this.editBank = { ...bank };
    this.formError.set('');
    this.isEditOpen.set(true);
  }

  closeEdit(): void {
    this.isEditOpen.set(false);
    this.selectedBank.set(null);
    this.formError.set('');
  }

  updateBank(): void {
    if (!this.editBank.bankName?.trim() || !this.editBank.holderName?.trim()) {
      this.formError.set('Banco y titular son obligatorios');
      return;
    }
    this.formError.set('');
    this.financeService.updateBank(this.selectedBank()!.id, this.editBank).subscribe({
      next: () => {
        this.closeEdit();
        this.loadData();
        this.showToast('Cuenta bancaria actualizada exitosamente', 'success');
      },
      error: (err: any) => this.formError.set(err?.error?.message || 'Error al actualizar cuenta bancaria'),
    });
  }

  viewTransactions(bank: any): void {
    // TODO: Implementar vista de transacciones bancarias
    this.showToast('Vista de transacciones próximamente', 'info');
  }

  private showToast(message: string, type: 'success' | 'error' | 'info'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      inactive: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
      frozen: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    };
    return map[status] || 'bg-slate-100 text-slate-800';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = { active: 'Activa', inactive: 'Inactiva', frozen: 'Congelada', closed: 'Cerrada' };
    return map[status] || status;
  }

  getAccountTypeLabel(type: string): string {
    const map: Record<string, string> = { checking: 'Cuenta Corriente', expenses: 'Gastos', mlc: 'MLC' };
    return map[type] || type;
  }

  formatCurrency(value: number | undefined, currency: string = 'CUP'): string {
    if (!value) return new Intl.NumberFormat('es-CU', { style: 'currency', currency }).format(0);
    return new Intl.NumberFormat('es-CU', { style: 'currency', currency }).format(value);
  }
}
