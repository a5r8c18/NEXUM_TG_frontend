import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FinanceService } from '../../../core/services/finance.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AccountingService } from '../../../core/services/accounting.service';
import { ContextService } from '../../../core/services/context.service';
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
  private accountingService = inject(AccountingService);
  private contextService = inject(ContextService);

  /** Unidad contable: la empresa activa. */
  companyName = computed(() => this.contextService.currentCompany()?.name || '');

  /** Único tipo de fondo. */
  static readonly FUND_TYPE = 'apertura';

  /** Los fondos antiguos pueden tener el tipo en texto libre: se muestra tal cual. */
  fundTypeLabel(value: string | null | undefined): string {
    if (!value) return '—';
    return value === CashComponent.FUND_TYPE ? 'Apertura' : value;
  }

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

  newCashRegister: any = this.emptyFund();
  isEditOpen = signal(false);
  editCashRegister: any = {};

  // ── Cuenta contable de la caja (Efectivo en Caja 101-108 y sus subcuentas) ──
  accountOptions = signal<any[]>([]);
  subaccounts = signal<any[]>([]);
  accountQuery = '';
  accountDrop = signal(false);

  private childrenOf(code: string): any[] {
    return this.subaccounts().filter(s => s.parentCode === code || s.code?.startsWith(`${code}-`));
  }

  /** Cuentas de Efectivo en Caja (101-108) postables o con subcuentas. */
  cashAccounts = computed(() =>
    this.accountOptions().filter(a => {
      if (a.code?.includes('-') || Number(a.level) >= 4) return false;
      const num = parseInt(a.code, 10);
      if (isNaN(num) || num < 101 || num > 108) return false;
      return a.allowsMovements || this.childrenOf(a.code).length > 0;
    }),
  );

  filteredCashAccounts(query: string): any[] {
    const q = (query || '').toLowerCase();
    const list = this.cashAccounts();
    return q ? list.filter(a => `${a.code} - ${a.name}`.toLowerCase().includes(q)) : list;
  }

  /** Subcuentas de la cuenta elegida, con su código completo `<cuenta>-<subcuenta>`. */
  cashSubOptions(parent: string): { value: string; label: string }[] {
    if (!parent) return [];
    return this.childrenOf(parent).map(s => ({
      value: s.code?.includes('-') ? s.code : `${parent}-${s.code}`,
      label: `${s.code} - ${s.name}`,
    }));
  }

  private accountLabel(code: string): string {
    const a = this.accountOptions().find(x => x.code === code);
    return a ? `${a.code} - ${a.name}` : code;
  }

  /** Cuenta y subcuenta para mostrar en la tabla. */
  accountingAccountLabel(value: string): string {
    if (!value) return '';
    const sub = this.subaccounts().find(s => s.code === value);
    if (!sub && !value.includes('-')) return this.accountLabel(value);
    const parent = sub?.parentCode || value.split('-')[0];
    return `${this.accountLabel(parent)} → ${sub ? `${sub.code} - ${sub.name}` : value}`;
  }

  selectCashAccount(target: any, code: string): void {
    target.account = code;
    target.subaccount = '';
    this.accountQuery = this.accountLabel(code);
    this.accountDrop.set(false);
  }

  /** Separa la cuenta guardada (cuenta o subcuenta completa) en los dos campos. */
  private splitAccount(value: string | null | undefined): { account: string; subaccount: string } {
    if (!value) return { account: '', subaccount: '' };
    const sub = this.subaccounts().find(s => s.code === value);
    if (sub || value.includes('-')) return { account: sub?.parentCode || value.split('-')[0], subaccount: value };
    return { account: value, subaccount: '' };
  }

  onAccountBlur(): void {
    setTimeout(() => this.accountDrop.set(false), 150);
  }
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
    this.accountingService.getAccounts({ activeOnly: 'true' }).subscribe({
      next: (accounts: any) => this.accountOptions.set(Array.isArray(accounts) ? accounts : []),
      error: () => {},
    });
    this.accountingService.getSubaccounts().subscribe({
      next: (subs: any) => this.subaccounts.set(Array.isArray(subs) ? subs : []),
      error: () => {},
    });
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

  private emptyFund(): any {
    return {
      registerCode: '', registerName: '', currency: 'CUP', exchangeRate: 1, fondo: CashComponent.FUND_TYPE,
      account: '', subaccount: '',
      openingDate: new Date().toISOString().split('T')[0],
      cashBalanceCup: 0, bookOpeningBalance: 0, bookBalance: 0,
    };
  }

  /** En CUP la tasa es siempre 1. */
  onCurrencyChange(target: any): void {
    if (target.currency === 'CUP') target.exchangeRate = 1;
  }

  /** Errores comunes de alta y edición del fondo. */
  private fundError(f: any): string {
    if (!f.registerName?.trim()) return 'El nombre es obligatorio';
    if (!f.account) return 'Seleccione la cuenta contable del fondo';
    if (this.cashSubOptions(f.account).length && !f.subaccount) return 'Seleccione la subcuenta de la cuenta contable';
    if (f.currency === 'USD' && !(Number(f.exchangeRate) > 1)) return 'La tasa de cambio en USD debe ser mayor que 1';
    if (['cashBalanceCup', 'bookOpeningBalance', 'bookBalance'].some(k => f[k] !== undefined && Number(f[k]) < 0)) {
      return 'Los saldos no pueden ser negativos';
    }
    return '';
  }

  openCreate(): void {
    this.newCashRegister = this.emptyFund();
    this.accountQuery = '';
    this.formError.set('');
    this.isCreateOpen.set(true);
  }

  openEdit(cr: any): void {
    this.editCashRegister = {
      id: cr.id,
      registerCode: cr.registerCode,
      registerName: cr.registerName || '',
      currency: cr.currency || 'CUP',
      exchangeRate: Number(cr.exchangeRate) || 1,
      fondo: cr.fondo || CashComponent.FUND_TYPE,
      ...this.splitAccount(cr.accountingAccount),
      bookOpeningBalance: Number(cr.bookOpeningBalance) || 0,
      bookBalance: Number(cr.bookBalance) || 0,
    };
    this.accountQuery = this.editCashRegister.account ? this.accountLabel(this.editCashRegister.account) : '';
    this.formError.set('');
    this.isEditOpen.set(true);
  }

  closeEdit(): void {
    this.isEditOpen.set(false);
    this.formError.set('');
  }

  saveEdit(): void {
    const e = this.editCashRegister;
    const error = this.fundError(e);
    if (error) {
      this.formError.set(error);
      return;
    }
    this.formError.set('');
    this.financeService.updateCashRegister(e.id, {
      registerName: e.registerName,
      fondo: e.fondo,
      accountingAccount: e.subaccount || e.account,
      exchangeRate: Number(e.exchangeRate) || 1,
      bookOpeningBalance: Number(e.bookOpeningBalance) || 0,
      bookBalance: Number(e.bookBalance) || 0,
    }).subscribe({
      next: () => {
        this.closeEdit();
        this.loadData();
        this.showToast('Fondo actualizado', 'success');
      },
      error: (err: any) => this.formError.set(err?.error?.message || 'Error al actualizar el fondo'),
    });
  }

  closeCreate(): void {
    this.isCreateOpen.set(false);
    this.formError.set('');
  }

  saveCashRegister(): void {
    const f = this.newCashRegister;
    const error = !f.registerCode?.trim() ? 'El código es obligatorio' : !f.openingDate ? 'La fecha de apertura es obligatoria' : this.fundError(f);
    if (error) {
      this.formError.set(error);
      return;
    }
    this.formError.set('');
    const { account, subaccount, ...fund } = f;
    this.financeService.createCashRegister({
      ...fund,
      accountingAccount: subaccount || account,
      exchangeRate: Number(f.exchangeRate) || 1,
      cashBalanceCup: Number(f.cashBalanceCup) || 0,
      bookOpeningBalance: Number(f.bookOpeningBalance) || 0,
      bookBalance: Number(f.bookBalance) || 0,
    }).subscribe({
      next: () => {
        this.closeCreate();
        this.loadData();
        this.showToast('Fondo creado exitosamente', 'success');
      },
      error: (err: any) => this.formError.set(err?.error?.message || 'Error al crear el fondo'),
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
