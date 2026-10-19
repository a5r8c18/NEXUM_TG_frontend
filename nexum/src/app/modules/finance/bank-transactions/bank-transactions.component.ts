import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FinanceService } from '../../../core/services/finance.service';
import { AccountingService } from '../../../core/services/accounting.service';
import { AuthService } from '../../../core/services/auth.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-bank-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './bank-transactions.component.html',
})
export class BankTransactionsComponent implements OnInit {
  private financeService = inject(FinanceService);
  private accountingService = inject(AccountingService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  type = this.route.snapshot.data['type'] as 'income' | 'expense';
  isIncome = this.type === 'income';
  transactionType = this.isIncome ? 'credit' : 'debit';
  pageTitle = this.isIncome ? 'Banco - Ingreso' : 'Banco - Egreso';

  /** Tipos de comprobante según si la pantalla es de ingreso o egreso. */
  readonly voucherTypes = this.isIncome
    ? ['Carga Inicial', 'Transferencia Electrónica Recibida', 'Otros cobros']
    : ['Transferencia Electrónica Emitida', 'Otros pagos'];

  banks = signal<any[]>([]);
  customers = signal<any[]>([]);
  selectedBankId = signal<string>('');
  transactions = signal<any[]>([]);
  isLoading = signal(false);
  saving = signal(false);
  isModalOpen = signal(false);
  editingTx = signal<any | null>(null);
  toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);

  form = {
    voucherType: '',
    transactionDate: new Date().toISOString().split('T')[0],
    amount: 0,
    referenceNumber: '',
    counterpartyAccount: '',
    customerName: '',
    exchangeRate: 1,
    notes: '',
  };

  // ── Cuenta bancaria filtrable ──
  bankQuery = '';
  bankDrop = signal(false);

  filteredBanks(query: string) {
    const q = (query || '').toLowerCase();
    const list = this.banks();
    const label = (b: any) => `${b.bankName} - ${b.accountNumber} (${b.currency})`;
    return q ? list.filter(b => label(b).toLowerCase().includes(q)) : list;
  }

  bankLabel(bank: any): string {
    return `${bank.bankName} - ${bank.accountNumber} (${bank.currency})`;
  }

  selectBank(bank: any): void {
    this.selectedBankId.set(bank.id);
    this.bankQuery = this.bankLabel(bank);
    this.bankDrop.set(false);
    if (bank.currency !== 'USD') this.form.exchangeRate = 1;
  }

  onBankBlur(): void {
    setTimeout(() => this.bankDrop.set(false), 150);
  }

  /** La tasa solo se habilita cuando la cuenta seleccionada es USD. */
  isUsdAccount(): boolean {
    return this.selectedBank()?.currency === 'USD';
  }

  /** Monto en CUP = monto × tasa (solo visible en transferencias/Otros pagos). */
  montoCup(): number {
    return Number(this.form.amount || 0) * Number(this.form.exchangeRate || 1);
  }

  /** Siglas del tipo de comprobante + consecutivo asignado en el backend. */
  voucherPrefix(): string {
    const map: Record<string, string> = {
      'Carga Inicial': 'CI',
      'Transferencia Electrónica Recibida': 'TER',
      'Otros cobros': 'OC',
      'Transferencia Electrónica Emitida': 'TEE',
      'Otros pagos': 'OP',
    };
    return map[this.form.voucherType] || '';
  }

  voucherNumberPreview(): string {
    const editing = this.editingTx();
    if (editing) return editing.transactionNumber;
    const p = this.voucherPrefix();
    return p ? `${p}-(auto)` : '-';
  }

  contabilizadoPor(): string {
    const u: any = this.authService.currentUser();
    if (!u) return '-';
    const full = `${u.firstName || ''} ${u.lastName || ''}`.trim();
    return full || u.email || '-';
  }

  /** La TER requiere seleccionar el cliente/entidad. */
  isTransferVoucher(): boolean {
    return this.form.voucherType.toLowerCase().includes('transferencia electrónica');
  }

  /** N° comprobante, contabilizado por, tasa y cliente en todo tipo menos Carga Inicial. */
  showTransferFields(): boolean {
    return !!this.form.voucherType && this.form.voucherType !== 'Carga Inicial';
  }

  customerQuery = '';
  customerDrop = signal(false);

  filteredCustomers(query: string) {
    const q = (query || '').toLowerCase();
    const list = this.customers();
    return q ? list.filter(c => c.name.toLowerCase().includes(q)) : list;
  }

  selectCustomer(customer: any): void {
    this.form.customerName = customer.name;
    this.customerQuery = customer.name;
    this.customerDrop.set(false);
  }

  createCustomerInline(): void {
    const name = this.customerQuery.trim();
    if (!name) return;
    this.financeService.createCustomer({ name }).subscribe({
      next: (c) => {
        this.customers.set([...this.customers(), c]);
        this.selectCustomer(c);
        this.showToast('Cliente creado', 'success');
      },
      error: () => this.showToast('Error creando el cliente', 'error'),
    });
  }

  onCustomerBlur(): void {
    setTimeout(() => this.customerDrop.set(false), 150);
  }

  accountOptions = signal<any[]>([]);
  subaccounts = signal<any[]>([]);
  accountQuery = '';
  accountDrop = signal(false);

  /** Cuentas del nomenclador con sus subcuentas anidadas debajo. */
  accountSelectOptions = computed(() => {
    const opts: { value: string; label: string; isSub: boolean; parentCode?: string }[] = [];
    const subs = this.subaccounts();
    for (const a of this.accountOptions()) {
      if (a.code?.includes('-') || Number(a.level) >= 4) continue;
      const children = subs.filter(s => s.parentCode === a.code || s.code?.startsWith(`${a.code}-`));
      if (!a.allowsMovements && children.length === 0) continue;
      opts.push({ value: a.code, label: `${a.code} - ${a.name}`, isSub: false });
      for (const s of children) {
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

  counterpartyAccountLabel(value: string): string {
    if (!value) return '';
    const opt = this.accountSelectOptions().find(o => o.value === value);
    if (!opt) return value;
    if (!opt.isSub) return opt.label;
    const parent = this.accountSelectOptions().find(o => o.value === opt.parentCode);
    return parent ? `${parent.label} → ${opt.label}` : opt.label;
  }

  selectCounterpartyAccount(value: string): void {
    this.form.counterpartyAccount = value;
    this.accountQuery = this.counterpartyAccountLabel(value);
    this.accountDrop.set(false);
  }

  onAccountBlur(): void {
    setTimeout(() => this.accountDrop.set(false), 150);
  }

  selectedBank = computed(() => this.banks().find(b => b.id === this.selectedBankId()) || null);

  ngOnInit(): void {
    this.loadBanks();
    this.accountingService.getAccounts({ activeOnly: 'true' }).subscribe({
      next: (accounts) => this.accountOptions.set(Array.isArray(accounts) ? accounts : []),
      error: () => {},
    });
    this.accountingService.getSubaccounts().subscribe({
      next: (subs) => this.subaccounts.set(Array.isArray(subs) ? subs : []),
      error: () => {},
    });
    this.financeService.getCustomers().subscribe({
      next: (data) => this.customers.set(Array.isArray(data) ? data : []),
      error: () => {},
    });
  }

  loadCustomers(): void {
    this.financeService.getCustomers().subscribe({
      next: (data) => this.customers.set(Array.isArray(data) ? data : []),
      error: () => {},
    });
  }

  loadBanks(): void {
    this.isLoading.set(true);
    this.financeService.getBanks().subscribe({
      next: (data) => {
        this.banks.set(Array.isArray(data) ? data : []);
        this.isLoading.set(false);
        this.loadTransactions();
      },
      error: () => {
        this.isLoading.set(false);
        this.showToast('Error cargando cuentas bancarias', 'error');
      },
    });
  }

  loadTransactions(): void {
    this.isLoading.set(true);
    this.financeService.getAllBankTransactions(this.transactionType).subscribe({
      next: (data) => {
        this.transactions.set(Array.isArray(data) ? data : []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.showToast('Error cargando transacciones', 'error');
      },
    });
  }

  openModal(): void {
    this.editingTx.set(null);
    this.resetForm();
    this.isModalOpen.set(true);
  }

  openEditModal(tx: any): void {
    this.editingTx.set(tx);
    this.form = {
      voucherType: tx.transactionCode || '',
      transactionDate: tx.transactionDate,
      amount: Number(tx.amount || 0),
      referenceNumber: tx.referenceNumber || '',
      counterpartyAccount: tx.counterpartyAccount || '',
      customerName: tx.counterpartyName || '',
      exchangeRate: Number(tx.exchangeRate || 1),
      notes: tx.notes || '',
    };
    this.accountQuery = this.counterpartyAccountLabel(tx.counterpartyAccount || '');
    this.customerQuery = tx.counterpartyName || '';
    this.selectedBankId.set(tx.bankAccountId);
    const bank = this.banks().find(b => b.id === tx.bankAccountId);
    this.bankQuery = bank ? this.bankLabel(bank) : '';
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingTx.set(null);
  }

  deleteTransaction(tx: any): void {
    if (!confirm(`¿Eliminar el comprobante ${tx.transactionNumber}? Se revertirá su efecto en el saldo.`)) return;
    this.financeService.deleteBankTransaction(tx.id).subscribe({
      next: () => {
        this.showToast('Comprobante eliminado', 'success');
        this.loadTransactions();
      },
      error: (err) => this.showToast(err?.error?.message || 'Error eliminando el comprobante', 'error'),
    });
  }

  submit(): void {
    const id = this.selectedBankId();
    if (!id) {
      this.showToast('Seleccione una cuenta bancaria', 'error');
      return;
    }
    if (!this.form.voucherType) {
      this.showToast('Seleccione el tipo de comprobante', 'error');
      return;
    }
    if (this.isTransferVoucher() && !this.form.customerName?.trim()) {
      this.showToast('Seleccione el cliente/entidad', 'error');
      return;
    }
    if (!this.form.amount || Number(this.form.amount) <= 0 || !this.form.notes?.trim()) {
      this.showToast('Monto y comentario son obligatorios', 'error');
      return;
    }

    const editing = this.editingTx();
    this.saving.set(true);
    const request$ = editing
      ? this.financeService.updateBankTransaction(editing.id, {
          transactionCode: this.form.voucherType,
          transactionDate: this.form.transactionDate,
          amount: Number(this.form.amount),
          referenceNumber: this.form.referenceNumber || undefined,
          counterpartyAccount: this.form.counterpartyAccount || undefined,
          counterpartyName: this.form.customerName || undefined,
          exchangeRate: Number(this.form.exchangeRate) || 1,
          notes: this.form.notes || undefined,
        })
      : this.financeService.createBankTransaction(id, {
          transactionType: this.transactionType,
          transactionCode: this.form.voucherType,
          transactionDate: this.form.transactionDate,
          amount: Number(this.form.amount),
          referenceNumber: this.form.referenceNumber || undefined,
          counterpartyAccount: this.form.counterpartyAccount || undefined,
          counterpartyName: this.form.customerName || undefined,
          currency: this.selectedBank()?.currency || 'CUP',
          exchangeRate: Number(this.form.exchangeRate) || 1,
          notes: this.form.notes || undefined,
        });
    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.showToast(editing ? 'Comprobante actualizado' : (this.isIncome ? 'Ingreso registrado' : 'Egreso registrado'), 'success');
        this.closeModal();
        this.resetForm();
        this.loadTransactions();
      },
      error: (err) => {
        this.saving.set(false);
        this.showToast(err?.error?.message || 'Error guardando la transacción', 'error');
      },
    });
  }

  resetForm(): void {
    this.form = {
      voucherType: '',
      transactionDate: new Date().toISOString().split('T')[0],
      amount: 0,
      referenceNumber: '',
      counterpartyAccount: '',
      customerName: '',
      exchangeRate: 1,
      notes: '',
    };
    this.accountQuery = '';
    this.customerQuery = '';
    this.bankQuery = '';
  }

  showToast(message: string, type: 'success' | 'error'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }

  formatCurrency(value: number): string {
    return Number(value || 0).toLocaleString('es-CU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
