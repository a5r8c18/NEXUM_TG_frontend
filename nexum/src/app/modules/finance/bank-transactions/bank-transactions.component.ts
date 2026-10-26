import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FinanceService } from '../../../core/services/finance.service';
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

  form = {
    voucherType: '',
    counterpartConceptCode: '',
    transactionDate: new Date().toISOString().split('T')[0],
    amount: 0,
    referenceNumber: '',
    counterpartyName: '',   // cliente, proveedor o trabajador según concepto
    exchangeRate: 1,
    notes: '',
  };

  // ── Concepto seleccionado y conceptos disponibles para este flujo ──
  conceptOptions = computed(() =>
    this.counterpartConcepts().filter(
      (c) => c.direction === 'both' || c.direction === (this.isIncome ? 'income' : 'expense'),
    ),
  );

  selectedConcept = computed(
    () => this.counterpartConcepts().find((c) => c.code === this.form.counterpartConceptCode) || null,
  );

  /** Etiqueta del campo de contrapartida según el concepto. */
  counterpartyLabel(): string {
    const c = this.selectedConcept();
    if (!c) return 'Cliente/Entidad';
    if (c.requiresCustomer) return 'Cliente/Entidad';
    if (c.requiresSupplier) return 'Proveedor';
    if (c.requiresEmployee) return 'Trabajador';
    return 'Cliente/Entidad';
  }

  /** ¿El concepto exige que se indique la contrapartida? */
  counterpartyRequired(): boolean {
    const c = this.selectedConcept();
    return !!(c?.requiresCustomer || c?.requiresSupplier || c?.requiresEmployee);
  }

  /** Lookup de concepto por código para la tabla del listado. */
  conceptLabel(code: string | null | undefined): string {
    if (!code) return '';
    const c = this.counterpartConcepts().find((x) => x.code === code);
    return c ? `${c.code} — ${c.name}` : code;
  }

  /** Muestra el concepto (nuevos) o la cuenta (históricos). */
  counterpartyDisplayLabel(tx: any): string {
    if (tx.counterpartConceptCode) return this.conceptLabel(tx.counterpartConceptCode);
    return tx.counterpartyAccount || '-';
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

  /** Bloque N° Comprobante / Tasa / Contabilizado por: visible en todo menos Carga Inicial. */
  showTransferFields(): boolean {
    return !!this.form.voucherType && this.form.voucherType !== 'Carga Inicial';
  }

  // ── Picker de clientes (solo cuando concept.requiresCustomer) ──
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

  selectedBank = computed(() => this.banks().find((b) => b.id === this.selectedBankId()) || null);

  ngOnInit(): void {
    this.loadBanks();
    this.loadCounterpartConcepts();
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
      counterpartConceptCode: tx.counterpartConceptCode || '',
      transactionDate: tx.transactionDate,
      amount: Number(tx.amount || 0),
      referenceNumber: tx.referenceNumber || '',
      counterpartyName: tx.counterpartyName || '',
      exchangeRate: Number(tx.exchangeRate || 1),
      notes: tx.notes || '',
    };
    this.customerQuery = tx.counterpartyName || '';
    this.selectedBankId.set(tx.bankAccountId);
    const bank = this.banks().find((b) => b.id === tx.bankAccountId);
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
    if (!this.form.counterpartConceptCode) {
      this.showToast('Seleccione un concepto de contrapartida', 'error');
      return;
    }
    if (this.counterpartyRequired() && !this.form.counterpartyName?.trim()) {
      this.showToast(`Indique ${this.counterpartyLabel().toLowerCase()}`, 'error');
      return;
    }
    if (!this.form.amount || Number(this.form.amount) <= 0 || !this.form.notes?.trim()) {
      this.showToast('Monto y comentario son obligatorios', 'error');
      return;
    }

    const editing = this.editingTx();
    this.saving.set(true);

    // Enviar el concepto (no la cuenta) y el nombre de la contrapartida unificado.
    const basePayload = {
      transactionCode: this.form.voucherType,
      transactionDate: this.form.transactionDate,
      amount: Number(this.form.amount),
      referenceNumber: this.form.referenceNumber || undefined,
      counterpartConceptCode: this.form.counterpartConceptCode,
      counterpartyName: this.form.counterpartyName || undefined,
      exchangeRate: Number(this.form.exchangeRate) || 1,
      notes: this.form.notes || undefined,
    };

    const request$ = editing
      ? this.financeService.updateBankTransaction(editing.id, basePayload)
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
      transactionDate: new Date().toISOString().split('T')[0],
      amount: 0,
      referenceNumber: '',
      counterpartyName: '',
      exchangeRate: 1,
      notes: '',
    };
    this.customerQuery = '';
    this.bankQuery = '';
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