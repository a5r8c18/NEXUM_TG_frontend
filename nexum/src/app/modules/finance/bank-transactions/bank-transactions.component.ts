import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { FinanceService } from '../../../core/services/finance.service';
import { AccountingService } from '../../../core/services/accounting.service';
import { AuthService } from '../../../core/services/auth.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

interface CounterpartConcept {
  code: string;
  name: string;
  description: string | null;
  direction: 'income' | 'expense' | 'both';
  requiresCustomer: boolean;
  requiresSupplier: boolean;
  requiresEmployee: boolean;
  requiresDocument: boolean;
  requiresExpenseElement: boolean;
  requiresExchangeRate: boolean;
  isActive: boolean;
}

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

  readonly voucherTypes = this.isIncome
    ? ['Carga Inicial', 'Transferencia Electrónica Recibida', 'Otros cobros']
    : ['Transferencia Electrónica Emitida', 'Otros pagos'];

  banks = signal<any[]>([]);
  customers = signal<any[]>([]);
  counterpartConcepts = signal<CounterpartConcept[]>([]);
  selectedBankId = signal<string>('');
  transactions = signal<any[]>([]);
  isLoading = signal(false);
  saving = signal(false);
  isModalOpen = signal(false);
  editingTx = signal<any | null>(null);
  toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);

  // Obligaciones de cobro (CxC) para liquidar desde el comprobante bancario.
  receivables = signal<any[]>([]);
  loadingReceivables = signal(false);
  showReceivablesPanel = signal(false);
  selectedReceivableId = signal<string>('');
  originalReceivableId = '';

  form = {
    voucherType: '',
    counterpartConceptCode: '',
    counterpartyAccount: '',
    transactionDate: new Date().toISOString().split('T')[0],
    amount: 0,
    referenceNumber: '',
    counterpartyName: '',
    exchangeRate: 1,
    notes: '',
  };

  get isOpeningEntry(): boolean {
    return this.form.voucherType === 'Carga Inicial';
  }

  conceptOptions = computed(() =>
    this.counterpartConcepts().filter(
      (c) => c.direction === 'both' || c.direction === (this.isIncome ? 'income' : 'expense'),
    ),
  );

  get selectedConcept(): CounterpartConcept | null {
    return this.counterpartConcepts().find((c) => c.code === this.form.counterpartConceptCode) || null;
  }

  /**
   * Concepto "20" = liquidación de obligación de cobro (CxC).
   * Aplica en creación y en edición de ingresos.
   */
  get isReceivableSettlement(): boolean {
    return this.isIncome && this.form.counterpartConceptCode === '20';
  }

  get selectedReceivable(): any | null {
    return (
      this.receivables().find((r) => r.id === this.selectedReceivableId()) || null
    );
  }

  counterpartyLabel(): string {
    const c = this.selectedConcept;
    if (!c) return 'Cliente/Entidad';
    if (c.requiresCustomer) return 'Cliente/Entidad';
    if (c.requiresSupplier) return 'Proveedor';
    if (c.requiresEmployee) return 'Trabajador';
    return 'Cliente/Entidad';
  }

  counterpartyRequired(): boolean {
    const c = this.selectedConcept;
    return !!(c?.requiresCustomer || c?.requiresSupplier || c?.requiresEmployee);
  }

  conceptLabel(code: string | null | undefined): string {
    if (!code) return '';
    const c = this.counterpartConcepts().find((x) => x.code === code);
    return c ? `${c.code} — ${c.name}` : code;
  }

  counterpartyDisplayLabel(tx: any): string {
    if (tx.counterpartConceptCode) return this.conceptLabel(tx.counterpartConceptCode);
    if (tx.counterpartyAccount) return this.accountingAccountLabel(tx.counterpartyAccount);
    return '-';
  }

  onVoucherTypeChange(): void {
    this.selectedReceivableId.set('');
    this.receivables.set([]);
    this.showReceivablesPanel.set(false);
    if (this.isOpeningEntry) {
      this.form.counterpartConceptCode = '';
      this.customerQuery = '';
      this.form.counterpartyName = '';
    } else {
      this.form.counterpartyAccount = '';
      this.accountQuery = '';
    }
  }

  // ── Cuenta bancaria filtrable ──
  bankQuery = '';
  bankDrop = signal(false);

  filteredBanks(query: string) {
    const q = (query || '').toLowerCase();
    const list = this.banks();
    const label = (b: any) => `${b.bankName} - ${b.accountNumber} (${b.currency})`;
    return q ? list.filter((b) => label(b).toLowerCase().includes(q)) : list;
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

  isUsdAccount(): boolean {
    return this.selectedBank()?.currency === 'USD';
  }

  montoCup(): number {
    return Number(this.form.amount || 0) * Number(this.form.exchangeRate || 1);
  }

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

  showTransferFields(): boolean {
    return !!this.form.voucherType && this.form.voucherType !== 'Carga Inicial';
  }

  // ── Picker de clientes ──
  customerQuery = '';
  customerDrop = signal(false);

  filteredCustomers(query: string) {
    const q = (query || '').toLowerCase();
    const list = this.customers();
    return q ? list.filter((c) => c.name.toLowerCase().includes(q)) : list;
  }

  selectCustomer(customer: any): void {
    this.form.counterpartyName = customer.name;
    this.customerQuery = customer.name;
    this.customerDrop.set(false);
    this.selectedReceivableId.set('');
    this.receivables.set([]);
    this.showReceivablesPanel.set(false);
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

  // ── Obligaciones de cobro (CxC) para concepto 20 ──
  openReceivablesPanel(): void {
    const customerName = this.form.counterpartyName?.trim();
    if (!customerName) {
      this.showToast('Seleccione primero el cliente', 'error');
      return;
    }
    this.loadingReceivables.set(true);
    this.showReceivablesPanel.set(true);
    this.financeService.getReceivables({ customerName }).subscribe({
      next: (data) => {
        const all = Array.isArray(data) ? data : [];
        const filtered = all.filter(
          (r) => !['paid', 'written_off', 'cancelled'].includes(r.status),
        );
        // La CxC ya vinculada debe seguir visible aunque esté saldada.
        if (
          this.originalReceivableId &&
          !filtered.some((r) => r.id === this.originalReceivableId)
        ) {
          const current = this.receivables().find(
            (r) => r.id === this.originalReceivableId,
          );
          if (current) filtered.unshift(current);
        }
        this.receivables.set(filtered);
        this.loadingReceivables.set(false);
      },
      error: () => {
        this.loadingReceivables.set(false);
        this.showToast('Error cargando obligaciones de cobro', 'error');
      },
    });
  }

  selectReceivable(rec: any): void {
    this.selectedReceivableId.set(rec.id);
    if (!this.form.amount || Number(this.form.amount) <= 0) {
      this.form.amount = Number(rec.balanceAmount);
    }
    this.showReceivablesPanel.set(false);
  }

  clearSelectedReceivable(): void {
    this.selectedReceivableId.set('');
  }

  // ── Picker de cuentas contables (Carga Inicial) ──
  accountOptions = signal<any[]>([]);
  subaccounts = signal<any[]>([]);
  accountQuery = '';
  accountDrop = signal(false);

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

  accountingAccountLabel(value: string): string {
    if (!value) return '';
    const opt = this.accountSelectOptions().find(o => o.value === value);
    if (!opt) return value;
    if (!opt.isSub) return opt.label;
    const parent = this.accountSelectOptions().find(o => o.value === opt.parentCode);
    return parent ? `${parent.label} → ${opt.label}` : opt.label;
  }

  selectCounterpartyAccount(value: string): void {
    this.form.counterpartyAccount = value;
    this.accountQuery = this.accountingAccountLabel(value);
    this.accountDrop.set(false);
  }

  onAccountBlur(): void {
    setTimeout(() => this.accountDrop.set(false), 150);
  }

  selectedBank = computed(() => this.banks().find((b) => b.id === this.selectedBankId()) || null);

  ngOnInit(): void {
    this.loadBanks();
    this.loadCounterpartConcepts();
    this.loadAccountingAccounts();
    this.financeService.getCustomers().subscribe({
      next: (data) => this.customers.set(Array.isArray(data) ? data : []),
      error: () => {},
    });
  }

  loadCounterpartConcepts(): void {
    this.financeService.getCounterpartConcepts().subscribe({
      next: (data) => this.counterpartConcepts.set(Array.isArray(data) ? data : []),
      error: () => {},
    });
  }

  loadAccountingAccounts(): void {
    this.accountingService.getAccounts({ activeOnly: 'true' }).subscribe({
      next: (accounts) => this.accountOptions.set(Array.isArray(accounts) ? accounts : []),
      error: (err) => this.showToast(err?.error?.message || 'Error cargando cuentas contables', 'error'),
    });
    this.accountingService.getSubaccounts().subscribe({
      next: (subs) => this.subaccounts.set(Array.isArray(subs) ? subs : []),
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
      counterpartConceptCode: tx.counterpartConceptCode || '',
      counterpartyAccount: tx.counterpartyAccount || '',
      transactionDate: tx.transactionDate,
      amount: Number(tx.amount || 0),
      referenceNumber: tx.referenceNumber || '',
      counterpartyName: tx.counterpartyName || '',
      exchangeRate: Number(tx.exchangeRate || 1),
      notes: tx.notes || '',
    };
    this.accountQuery = tx.counterpartyAccount
      ? this.accountingAccountLabel(tx.counterpartyAccount)
      : '';
    this.customerQuery = tx.counterpartyName || '';
    this.selectedBankId.set(tx.bankAccountId);
    const bank = this.banks().find((b) => b.id === tx.bankAccountId);
    this.bankQuery = bank ? this.bankLabel(bank) : '';
    this.selectedReceivableId.set('');
    this.originalReceivableId = '';
    this.receivables.set([]);
    this.showReceivablesPanel.set(false);
    this.isModalOpen.set(true);

    if (this.isIncome && tx.counterpartConceptCode === '20') {
      this.loadReceivablesForEdit(tx);
    }
  }

  /** Carga la CxC ya vinculada al comprobante + las disponibles del cliente. */
  private loadReceivablesForEdit(tx: any): void {
    this.loadingReceivables.set(true);
    this.financeService.getLinkedReceivable(tx.id).subscribe({
      next: (linked) => {
        const currentAr = linked?.accountReceivable || null;
        this.originalReceivableId = currentAr?.id || '';

        const query = tx.counterpartyName?.trim();
        const all$ = query
          ? this.financeService.getReceivables({ customerName: query })
          : of([]);

        all$.subscribe({
          next: (all) => {
            const list = (Array.isArray(all) ? all : []).filter(
              (r) => !['paid', 'written_off', 'cancelled'].includes(r.status),
            );
            if (currentAr && !list.some((r) => r.id === currentAr.id)) {
              list.unshift(currentAr);
            }
            this.receivables.set(list);
            if (currentAr) this.selectedReceivableId.set(currentAr.id);
            this.loadingReceivables.set(false);
          },
          error: () => {
            if (currentAr) {
              this.receivables.set([currentAr]);
              this.selectedReceivableId.set(currentAr.id);
            }
            this.loadingReceivables.set(false);
          },
        });
      },
      error: () => {
        this.loadingReceivables.set(false);
      },
    });
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

    const opening = this.isOpeningEntry;
    const editing = this.editingTx();

    if (opening) {
      if (!this.form.counterpartyAccount?.trim()) {
        this.showToast('Seleccione una cuenta contable', 'error');
        return;
      }
    } else {
      if (!this.form.counterpartConceptCode) {
        this.showToast('Seleccione un concepto de contrapartida', 'error');
        return;
      }
      if (this.counterpartyRequired() && !this.form.counterpartyName?.trim()) {
        this.showToast(`Indique ${this.counterpartyLabel().toLowerCase()}`, 'error');
        return;
      }
      if (this.isReceivableSettlement && !this.selectedReceivableId()) {
        this.showToast('Seleccione la obligación de cobro a liquidar', 'error');
        return;
      }
    }

    if (!this.form.amount || Number(this.form.amount) <= 0 || !this.form.notes?.trim()) {
      this.showToast('Monto y comentario son obligatorios', 'error');
      return;
    }

    this.saving.set(true);

    const basePayload: any = {
      transactionCode: this.form.voucherType,
      transactionDate: this.form.transactionDate,
      amount: Number(this.form.amount),
      referenceNumber: this.form.referenceNumber || undefined,
      exchangeRate: Number(this.form.exchangeRate) || 1,
      notes: this.form.notes || undefined,
    };

    if (opening) {
      basePayload.counterpartyAccount = this.form.counterpartyAccount;
      basePayload.counterpartConceptCode = null;
      basePayload.counterpartyName = null;
    } else {
      basePayload.counterpartConceptCode = this.form.counterpartConceptCode;
      basePayload.counterpartyAccount = null;
      basePayload.counterpartyName = this.form.counterpartyName || null;

      // Enviar `accountReceivableId` si el comprobante es (o era) liquidación
      // de CxC, tanto en creación como en edición:
      //   - concepto 20 hoy      → id seleccionado (o null si no hay)
      //   - concepto 20 antes    → null (para revertir el pago previo)
      const wasReceivable = editing?.counterpartConceptCode === '20';
      const isReceivableNow = this.isReceivableSettlement;
      if (wasReceivable || isReceivableNow) {
        basePayload.accountReceivableId = isReceivableNow
          ? this.selectedReceivableId() || null
          : null;
      }
    }

    // En edición, solo enviamos bankAccountId si realmente cambió. En creación
    // el banco va en la URL, por eso no se incluye en el payload.
    const payloadForUpdate =
      editing && this.selectedBankId() && this.selectedBankId() !== editing.bankAccountId
        ? { ...basePayload, bankAccountId: this.selectedBankId() }
        : basePayload;

    const request$ = editing
      ? this.financeService.updateBankTransaction(editing.id, payloadForUpdate)
      : this.financeService.createBankTransaction(id, {
          ...basePayload,
          transactionType: this.transactionType,
          currency: this.selectedBank()?.currency || 'CUP',
        });

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.showToast(
          editing ? 'Comprobante actualizado' : this.isIncome ? 'Ingreso registrado' : 'Egreso registrado',
          'success',
        );
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
      counterpartConceptCode: '',
      counterpartyAccount: '',
      transactionDate: new Date().toISOString().split('T')[0],
      amount: 0,
      referenceNumber: '',
      counterpartyName: '',
      exchangeRate: 1,
      notes: '',
    };
    this.accountQuery = '';
    this.customerQuery = '';
    this.bankQuery = '';
    this.selectedReceivableId.set('');
    this.originalReceivableId = '';
    this.receivables.set([]);
    this.showReceivablesPanel.set(false);
  }

  showToast(message: string, type: 'success' | 'error'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }

  formatCurrency(value: number): string {
    return Number(value || 0).toLocaleString('es-CU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}