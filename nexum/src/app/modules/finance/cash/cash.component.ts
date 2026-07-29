import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FinanceService } from '../../../core/services/finance.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PaginationComponent, PaginationConfig } from '../../../shared/components/pagination/pagination.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-cash',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, ModalComponent],
  templateUrl: './cash.component.html',
})
export class CashComponent implements OnInit, OnDestroy {
  private financeService = inject(FinanceService);
  private notificationService = inject(NotificationService);

  items = signal<any[]>([]);
  stats = signal<any>(null);
  banks = signal<any[]>([]);
  isLoading = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  isCreateOpen = signal(false);
  isOpenModal = signal(false);
  isCloseModal = signal(false);
  isAuditModal = signal(false);
  isDepositModal = signal(false);

  selectedRegister = signal<any>(null);
  formError = signal('');
  auditResult = signal<any>(null);

  newCashRegister: any = { registerCode: '', registerName: '', responsibleName: '', openingBalance: 0 };
  openingBalance = 0;
  physicalBalance = 0;
  depositBankAccountId = '';
  depositAmount = 0;
  depositDescription = '';

  private refreshSub!: Subscription;
  private toastSub!: Subscription;

  currentPage = signal(1);
  pageSize = 10;

  availableBanks = computed(() => this.banks().filter(b => b.status === 'active'));

  pagedItems = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.items().slice(start, start + this.pageSize);
  });

  paginationConfig = computed<PaginationConfig>(() => ({
    currentPage: this.currentPage(),
    totalItems: this.items().length,
    totalPages: Math.ceil(this.items().length / this.pageSize),
    itemsPerPage: this.pageSize,
  }));

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  ngOnInit(): void {
    this.loadData();
    this.loadBanks();
    this.refreshSub = this.notificationService.refresh$.subscribe(() => {
      this.loadData();
      this.loadBanks();
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
    Promise.all([
      this.financeService.getCashRegisters().toPromise(),
      this.financeService.getCashStats().toPromise(),
    ]).then(([registers, stats]) => {
      this.items.set(registers || []);
      this.stats.set(stats || {});
      this.currentPage.set(1);
      this.isLoading.set(false);
    }).catch(() => { this.hasError.set(true); this.isLoading.set(false); });
  }

  loadBanks(): void {
    this.financeService.getBanks().subscribe({
      next: (data: any) => this.banks.set(Array.isArray(data) ? data : (data?.data ?? data?.items ?? [])),
      error: () => {},
    });
  }

  openCreate(): void {
    this.newCashRegister = { registerCode: '', registerName: '', responsibleName: '', openingBalance: 0 };
    this.formError.set('');
    this.isCreateOpen.set(true);
  }

  closeCreate(): void {
    this.isCreateOpen.set(false);
    this.formError.set('');
  }

  saveCashRegister(): void {
    if (!this.newCashRegister.registerCode?.trim() || !this.newCashRegister.registerName?.trim() || !this.newCashRegister.responsibleName?.trim()) {
      this.formError.set('Código, nombre y responsable son obligatorios');
      return;
    }
    this.formError.set('');
    this.financeService.createCashRegister(this.newCashRegister).subscribe({
      next: () => {
        this.closeCreate();
        this.loadData();
        this.showToast('Caja creada exitosamente', 'success');
      },
      error: (err: any) => this.formError.set(err?.error?.message || 'Error al crear caja'),
    });
  }

  openOpenModal(register: any): void {
    this.selectedRegister.set(register);
    this.openingBalance = 0;
    this.formError.set('');
    this.isOpenModal.set(true);
  }

  closeOpenModal(): void {
    this.isOpenModal.set(false);
    this.selectedRegister.set(null);
    this.formError.set('');
  }

  confirmOpen(): void {
    this.financeService.openCashRegister(this.selectedRegister()!.id, this.openingBalance || undefined).subscribe({
      next: () => {
        this.closeOpenModal();
        this.loadData();
        this.showToast('Caja abierta exitosamente', 'success');
      },
      error: (err: any) => this.formError.set(err?.error?.message || 'Error al abrir caja'),
    });
  }

  openCloseModal(register: any): void {
    this.selectedRegister.set(register);
    this.formError.set('');
    this.isCloseModal.set(true);
  }

  closeCloseModal(): void {
    this.isCloseModal.set(false);
    this.selectedRegister.set(null);
    this.formError.set('');
  }

  confirmClose(): void {
    this.financeService.closeCashRegister(this.selectedRegister()!.id).subscribe({
      next: () => {
        this.closeCloseModal();
        this.loadData();
        this.showToast('Caja cerrada exitosamente', 'success');
      },
      error: (err: any) => this.formError.set(err?.error?.message || 'Error al cerrar caja'),
    });
  }

  openAuditModal(register: any): void {
    this.selectedRegister.set(register);
    this.physicalBalance = 0;
    this.auditResult.set(null);
    this.formError.set('');
    this.isAuditModal.set(true);
  }

  closeAuditModal(): void {
    this.isAuditModal.set(false);
    this.selectedRegister.set(null);
    this.auditResult.set(null);
    this.formError.set('');
  }

  confirmAudit(): void {
    this.financeService.performCashAudit(this.selectedRegister()!.id, this.physicalBalance).subscribe({
      next: (result) => {
        this.auditResult.set(result);
        this.loadData();
        if (result.difference === 0) {
          this.showToast('Arqueo correcto. No hay diferencias.', 'success');
        } else {
          this.showToast(`Diferencia detectada: ${result.difference > 0 ? '+' : ''}${this.formatCurrency(result.difference)}`, 'error');
        }
      },
      error: (err: any) => this.formError.set(err?.error?.message || 'Error al realizar arqueo'),
    });
  }

  openDepositModal(register: any): void {
    this.selectedRegister.set(register);
    this.depositBankAccountId = '';
    this.depositAmount = 0;
    this.depositDescription = '';
    this.formError.set('');
    this.isDepositModal.set(true);
  }

  closeDepositModal(): void {
    this.isDepositModal.set(false);
    this.selectedRegister.set(null);
    this.formError.set('');
  }

  confirmDeposit(): void {
    if (!this.depositBankAccountId || !this.depositAmount) {
      this.formError.set('Cuenta bancaria y monto son obligatorios');
      return;
    }
    this.formError.set('');
    this.financeService.depositToBank(
      this.selectedRegister()!.id,
      this.depositBankAccountId,
      this.depositAmount,
      this.depositDescription
    ).subscribe({
      next: () => {
        this.closeDepositModal();
        this.loadData();
        this.showToast('Depósito realizado exitosamente', 'success');
      },
      error: (err: any) => this.formError.set(err?.error?.message || 'Error al realizar depósito'),
    });
  }

  private showToast(message: string, type: 'success' | 'error' | 'info'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      open: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      closed: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
      suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return map[status] || 'bg-slate-100 text-slate-800';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = { open: 'Abierta', closed: 'Cerrada', suspended: 'Suspendida' };
    return map[status] || status;
  }

  formatCurrency(value: number | undefined): string {
    if (!value) return '$0.00';
    return new Intl.NumberFormat('es-CU', { style: 'currency', currency: 'CUP' }).format(value);
  }
}
