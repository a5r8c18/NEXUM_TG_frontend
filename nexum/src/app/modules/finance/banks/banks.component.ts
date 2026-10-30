import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FinanceService } from '../../../core/services/finance.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ExchangeRateService } from '../../../core/services/exchange-rate.service';
import { CompanyService } from '../../../core/services/company.service';
import { AuthService } from '../../../core/services/auth.service';
import { AccountingService } from '../../../core/services/accounting.service';
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
  private exchangeRateService = inject(ExchangeRateService);
  private companyService = inject(CompanyService);
  private authService = inject(AuthService);
  private accountingService = inject(AccountingService);

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
  isTransactionsOpen = signal(false);
  selectedBank = signal<any>(null);
  selectedBankForTransactions = signal<any>(null);
  bankTransactions = signal<any[]>([]);
  isTransactionsLoading = signal(false);

  private readonly incomeTypes = ['credit', 'transfer_in', 'interest'];

  /** Importe con signo según el tipo de operación. */
  signedAmount(tx: any): number {
    const amount = Number(tx.amount || 0);
    return this.incomeTypes.includes(tx.transactionType) ? amount : -amount;
  }

  /** Transacciones ordenadas por fecha con el saldo corrido. */
  txRows = computed(() => {
    const bank = this.selectedBankForTransactions();
    const txs = [...this.bankTransactions()].sort(
      (a, b) => (a.transactionDate || '').localeCompare(b.transactionDate || '') ||
        (a.transactionNumber || '').localeCompare(b.transactionNumber || ''),
    );
    const total = txs.reduce((s, tx) => s + this.signedAmount(tx), 0);
    let balance = Number(bank?.balance || 0) - total;
    return txs.map((tx) => {
      const signed = this.signedAmount(tx);
      balance += signed;
      return { tx, signedAmount: signed, balance };
    });
  });

  activeDetailTab = signal<'fondo' | 'operaciones'>('fondo');
  readonly detailTabs = [
    { key: 'fondo', label: 'Fondo de banco' },
    { key: 'operaciones', label: 'Operaciones efectuadas' },
  ] as const;

  setDetailTab(tab: 'fondo' | 'operaciones'): void {
    this.activeDetailTab.set(tab);
  }

  formError = signal('');
  accountOptions = signal<any[]>([]);
  subaccounts = signal<any[]>([]);
  accountQueryCreate = '';
  accountQueryEdit = '';
  accountDropCreate = signal(false);
  accountDropEdit = signal(false);

  /** Cuentas con sus subcuentas anidadas debajo, para el selector filtrable. */
  accountSelectOptions = computed(() => {
    const opts: { value: string; label: string; isSub: boolean; parentCode?: string }[] = [];
    const subs = this.subaccounts();
    for (const a of this.accountOptions()) {
      if (a.code?.includes('-') || Number(a.level) >= 4) continue; // las subcuentas se anidan debajo de su padre
      // Solo cuentas de efectivo en banco (109-119) del clasificador.
      const num = parseInt(a.code, 10);
      if (isNaN(num) || num < 109 || num > 119) continue;
      const children = subs.filter(s => s.parentCode === a.code || s.code?.startsWith(`${a.code}-`));
      // Solo cuentas postables o agrupadoras con subcuentas (ej. 109 con subcuentas).
      if (!a.allowsMovements && children.length === 0) continue;
      opts.push({ value: a.code, label: `${a.code} - ${a.name}`, isSub: false });
      for (const s of children) {
        // El valor combina cuenta y subcuenta (p.ej. "109-0010") porque los
        // códigos de subcuenta no llevan el prefijo del padre en la BD.
        const value = s.code?.includes('-') ? s.code : `${a.code}-${s.code}`;
        opts.push({ value, label: `${s.code} - ${s.name}`, isSub: true, parentCode: a.code });
      }
    }
    return opts;
  });

  filteredAccountOptions(query: string) {
    const q = (query || '').toLowerCase();
    const opts = this.accountSelectOptions();
    return q ? opts.filter(o => o.label.toLowerCase().includes(q)) : opts;
  }

  /** Etiqueta del campo: cuenta, o "cuenta → subcuenta" si se eligió una subcuenta. */
  accountingAccountLabel(value: string): string {
    if (!value) return '';
    const opt = this.accountSelectOptions().find(o => o.value === value);
    if (!opt) return value;
    if (!opt.isSub) return opt.label;
    const parent = this.accountSelectOptions().find(o => o.value === opt.parentCode);
    return parent ? `${parent.label} → ${opt.label}` : opt.label;
  }

  selectAccountingAccount(value: string, which: 'create' | 'edit'): void {
    const label = this.accountingAccountLabel(value);
    if (which === 'create') {
      this.newBank.accountingAccount = value;
      this.accountQueryCreate = label;
      this.accountDropCreate.set(false);
    } else {
      this.editBank.accountingAccount = value;
      this.accountQueryEdit = label;
      this.accountDropEdit.set(false);
    }
  }

  onAccountBlur(which: 'create' | 'edit'): void {
    setTimeout(() => {
      if (which === 'create') this.accountDropCreate.set(false);
      else this.accountDropEdit.set(false);
    }, 150);
  }

  newBank: any = { bankName: '', bankCode: '', accountName: '', accountNumber: '', accountType: 'checking', fondo: '', accountingAccount: '', holderName: '', balance: 0, currency: 'CUP', openingDate: new Date().toISOString().split('T')[0] };
  editBank: any = {};

  readonly accountTypes = [
    { value: 'checking', label: 'Cuenta Corriente' },
    { value: 'expenses', label: 'Gastos' },
    { value: 'mlc', label: 'MLC' },
  ];

  private refreshSub!: Subscription;
  private toastSub!: Subscription;

  companyTenantType = signal<string>('state');
  exchangeRate = computed(() => {
    const r = this.exchangeRateService.rates();
    if (!r) return null;
    return this.companyTenantType() === 'non-state' ? r.segmentoIII : r.segmentoI;
  });

  balanceInCup(bank: any): number | null {
    const rate = this.exchangeRate();
    if (bank.currency === 'CUP') return Number(bank.balance || 0);
    if (rate == null) return null;
    return Number(bank.balance || 0) * rate;
  }

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
    this.exchangeRateService.load();
    this.accountingService.getAccounts({ type: 'asset', activeOnly: 'true' }).subscribe({
      next: (accounts) => this.accountOptions.set(Array.isArray(accounts) ? accounts : []),
      error: () => {},
    });
    this.accountingService.getSubaccounts().subscribe({
      next: (subs) => this.subaccounts.set(Array.isArray(subs) ? subs : []),
      error: () => {},
    });
    const companyId = this.authService.getCurrentCompanyId();
    if (companyId) {
      this.companyService.getCompany(companyId).subscribe({
        next: (c) => this.companyTenantType.set(c?.tenant_type || 'state'),
        error: () => {},
      });
    }
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
    this.newBank = { bankName: '', bankCode: '', accountName: '', accountNumber: '', accountType: 'checking', fondo: '', accountingAccount: '', holderName: '', balance: 0, currency: 'CUP', openingDate: new Date().toISOString().split('T')[0] };
    this.accountQueryCreate = '';
    this.accountDropCreate.set(false);
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
    if (!this.newBank.accountingAccount?.trim()) {
      this.formError.set('Seleccione la cuenta contable a la que se vincula la cuenta bancaria');
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
    this.accountQueryEdit = this.accountingAccountLabel(bank.accountingAccount || '');
    this.accountDropEdit.set(false);
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
    if (!this.editBank.accountingAccount?.trim()) {
      this.formError.set('Seleccione la cuenta contable a la que se vincula la cuenta bancaria');
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

  viewDetails(bank: any): void {
    this.selectedBankForTransactions.set(bank);
    this.isTransactionsOpen.set(true);
    this.loadBankTransactions();
  }

  closeTransactions(): void {
    this.isTransactionsOpen.set(false);
    this.selectedBankForTransactions.set(null);
    this.bankTransactions.set([]);
    this.activeDetailTab.set('fondo');
  }

  loadBankTransactions(): void {
    const bank = this.selectedBankForTransactions();
    if (!bank) return;
    this.isTransactionsLoading.set(true);
    this.financeService.getBankTransactions(bank.id).subscribe({
      next: (data) => {
        this.bankTransactions.set(Array.isArray(data) ? data : []);
        this.isTransactionsLoading.set(false);
      },
      error: () => {
        this.isTransactionsLoading.set(false);
        this.showToast('Error cargando transacciones', 'error');
      },
    });
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

  /** Importe sin símbolo de moneda: negativo con '-', positivo sin signo. */
  formatSignedAmount(value: number, currency: string = 'CUP'): string {
    const abs = Math.abs(value).toLocaleString('es-CU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${value < 0 ? '-' : ''}${abs} ${currency}`;
  }

  formatDate(date: string | undefined): string {
    return date ? new Date(date).toLocaleDateString('es-CU') : '-';
  }

  getOperationStatusLabel(status: string | undefined): string {
    const labels: Record<string, string> = { draft: 'Borrador', edited: 'Editado', confirmed: 'Confirmado' };
    return labels[status || 'confirmed'] || 'Confirmado';
  }

  getOperationStatusClass(status: string | undefined): string {
    const classes: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
      edited: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      confirmed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    };
    return classes[status || 'confirmed'] || classes['confirmed'];
  }
}
