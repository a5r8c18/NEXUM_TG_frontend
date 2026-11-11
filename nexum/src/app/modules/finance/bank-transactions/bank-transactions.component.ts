import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { FinanceService } from '../../../core/services/finance.service';
import { AccountingService } from '../../../core/services/accounting.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { SuppliersService } from '../../../core/services/suppliers.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { CustomerQuickCreateComponent } from '../../../shared/components/quick-create/customer-quick-create.component';
import { SupplierQuickCreateComponent } from '../../../shared/components/quick-create/supplier-quick-create.component';

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
  imports: [CommonModule, FormsModule, ModalComponent, CustomerQuickCreateComponent, SupplierQuickCreateComponent],
  templateUrl: './bank-transactions.component.html',
})
export class BankTransactionsComponent implements OnInit {
  private suppliersService = inject(SuppliersService);
  private financeService = inject(FinanceService);
  private accountingService = inject(AccountingService);
  private authService = inject(AuthService);
  private confirmDialog = inject(ConfirmDialogService);
  private route = inject(ActivatedRoute);

  type = this.route.snapshot.data['type'] as 'income' | 'expense';
  /** Concepto de contrapartida fijado por la ruta (26 cobros anticipados, 27 pagos anticipados). */
  fixedConcept = this.route.snapshot.data['concept'] as string | undefined;
  /** Comprobante a abrir al cargar (llega como `?open=<id>`, p. ej. desde el Historial contable). */
  private pendingOpenId: string | null = this.route.snapshot.queryParamMap.get('open');
  isIncome = this.type === 'income';
  transactionType = this.isIncome ? 'credit' : 'debit';
  /** Etiqueta singular del tipo de comprobante según la ruta. */
  get typeLabel(): string {
    if (this.fixedConcept === '26') return 'Cobro Anticipado';
    if (this.fixedConcept === '27') return 'Pago Anticipado';
    return this.isIncome ? 'Ingreso' : 'Egreso';
  }
  pageTitle = this.fixedConcept === '26'
    ? 'Cobros Anticipados'
    : this.fixedConcept === '27'
      ? 'Pagos Anticipados'
      : this.isIncome ? 'Banco - Ingreso' : 'Banco - Egreso';

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
  isViewOpen = signal(false);
  viewTx = signal<any | null>(null);
  editingTx = signal<any | null>(null);
  toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);

  // Obligaciones de cobro (CxC) para liquidar desde el comprobante bancario.
  receivables = signal<any[]>([]);
  loadingReceivables = signal(false);
  receivablesModalOpen = signal(false);
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
    incomeAccount: '',
    incomeSubaccount: '',
    feeSubaccount: '',
    incomeAmount: 0,
    feeAccount: '',
    feeAmount: 0,
  };

  get isOpeningEntry(): boolean {
    return this.form.voucherType === 'Carga Inicial';
  }

  /** Concepto "19" = Ingresos por Pago en Línea (comisión bancaria). */
  get isOnlinePayment(): boolean {
    return this.isIncome && !this.isOpeningEntry && this.form.counterpartConceptCode === '19';
  }

  /** Conceptos que piden cuenta de ingreso del nomenclador: 19, 22 (comedores) y 23 (cafetería). */
  get isIncomeAccountConcept(): boolean {
    return this.isIncome && !this.isOpeningEntry && ['19', '22', '23'].includes(this.form.counterpartConceptCode);
  }

  /** Cuenta de ingreso propuesta al elegir el concepto: 900 fija en el 19, 950 por defecto en el 22. */
  private get defaultIncomeAccount(): string {
    if (this.isOnlinePayment) return '900';
    return this.isIncome && !this.isOpeningEntry && this.form.counterpartConceptCode === '22' ? '950' : '';
  }

  /** Lo que entra al banco: ingreso bruto menos la comisión. */
  get onlineNetAmount(): number {
    const net = Number(this.form.incomeAmount || 0) - Number(this.form.feeAmount || 0);
    return Math.round(net * 100) / 100;
  }

  /** 28 se liquida desde Cobros anticipados; 80 y 81 son efectivo y van por Caja. */
  private static readonly BANK_INCOME_EXCLUDED = ['28', '80', '81'];

  conceptOptions = computed(() =>
    this.counterpartConcepts().filter(
      (c) =>
        (c.direction === 'both' || c.direction === (this.isIncome ? 'income' : 'expense')) &&
        // Al editar se conserva el concepto que ya tenía el comprobante.
        !(this.isIncome &&
          BankTransactionsComponent.BANK_INCOME_EXCLUDED.includes(c.code) &&
          c.code !== this.editingTx()?.counterpartConceptCode),
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

  /** Concepto "26" = Cobros anticipados: acredita la cuenta 430 fijada. */
  get isAdvanceCollection(): boolean {
    return this.isIncome && this.form.counterpartConceptCode === '26';
  }

  /** Concepto "27" = Pagos anticipados: debita la cuenta elegida por el usuario. */
  get isAdvancePayment(): boolean {
    return !this.isIncome && this.form.counterpartConceptCode === '27';
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
    // El campo se muestra siempre que el concepto lo defina. Es obligatorio
    // para proveedores y trabajadores, y también con clientes cuando el
    // comprobante liquida una CxC/CxP (20/21) o es un anticipo (26/27): el
    // tercero es el que vincula el cobro o pago con su obligación.
    const c = this.selectedConcept;
    return (
      !!(c?.requiresSupplier || c?.requiresEmployee) ||
      ['20', '21', '26', '27'].includes(this.form.counterpartConceptCode)
    );
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
    this.receivablesModalOpen.set(false);
    this.selectedPayableId.set('');
    this.payables.set([]);
    this.payablesModalOpen.set(false);
    if (this.isOpeningEntry) {
      this.form.counterpartConceptCode = '';
      this.customerQuery = '';
      this.supplierQuery = '';
      this.form.counterpartyName = '';
    } else {
      this.form.counterpartyAccount = '';
      this.accountQuery = '';
    }
  }

  onConceptChange(): void {
    this.selectedReceivableId.set('');
    this.receivables.set([]);
    this.receivablesModalOpen.set(false);
    this.selectedPayableId.set('');
    this.payables.set([]);
    this.payablesModalOpen.set(false);
    this.form.incomeAccount = this.defaultIncomeAccount;
    this.form.incomeSubaccount = '';
    // La comisión del concepto 19 va por defecto a la 835-0010 (Gastos por comisiones bancarias).
    this.form.feeSubaccount =
      this.isOnlinePayment && this.feeSubaccountOptions().some((o) => o.value === '835-0010') ? '835-0010' : '';
    this.form.incomeAmount = 0;
    this.form.feeAccount = this.isOnlinePayment ? '835' : '';
    this.form.feeAmount = 0;
    this.incomeAccountQuery = this.isOnlinePayment ? '900' : this.accountingAccountLabel(this.form.incomeAccount);
    this.feeAccountQuery = this.isOnlinePayment ? '835' : '';
    if (this.isAdvanceCollection) {
      this.form.counterpartyAccount = '430';
      this.accountQuery = '430';
    } else if (this.form.counterpartyAccount === '430') {
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

  /** Tasa y Monto CUP: comprobantes normales y Carga Inicial de cuentas USD. */
  showExchangeFields(): boolean {
    return this.showTransferFields() || (this.isOpeningEntry && this.isUsdAccount());
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
    this.receivablesModalOpen.set(false);
    this.selectedPayableId.set('');
    this.payables.set([]);
    this.payablesModalOpen.set(false);
  }

  /** Abre la ficha de alta de cliente con el nombre escrito en el buscador. */
  isCustomerCreateOpen = signal(false);
  createCustomerInline(): void {
    this.customerDrop.set(false);
    this.isCustomerCreateOpen.set(true);
  }

  onCustomerCreated(c: any): void {
    this.customers.set([...this.customers(), c]);
    this.selectCustomer(c);
    this.isCustomerCreateOpen.set(false);
    this.showToast(`Cliente "${c.name}" creado`, 'success');
  }

  onCustomerBlur(): void {
    setTimeout(() => this.customerDrop.set(false), 150);
  }

  // ── Picker de proveedores ──
  suppliers = signal<any[]>([]);
  supplierQuery = '';
  supplierDrop = signal(false);
  isSupplierCreateOpen = signal(false);

  supplierName(s: any): string {
    return s?.businessName || s?.tradeName || s?.name || '';
  }

  filteredSuppliers(query: string) {
    const q = (query || '').toLowerCase();
    const list = this.suppliers();
    return q
      ? list.filter((s) =>
          [this.supplierName(s), s.tradeName, s.supplierCode, s.nit].some((v) => v?.toLowerCase().includes(q)),
        )
      : list;
  }

  supplierExists(query: string): boolean {
    const q = (query || '').trim().toLowerCase();
    return this.suppliers().some((s) => this.supplierName(s).toLowerCase() === q);
  }

  selectSupplier(s: any): void {
    const name = this.supplierName(s);
    this.form.counterpartyName = name;
    this.supplierQuery = name;
    this.supplierDrop.set(false);
    this.selectedPayableId.set('');
    this.payables.set([]);
    this.payablesModalOpen.set(false);
  }

  /** El texto libre también vale como proveedor (compatibilidad con registros previos). */
  onSupplierInput(value: string): void {
    this.form.counterpartyName = value;
    this.supplierDrop.set(true);
  }

  createSupplierInline(): void {
    this.supplierDrop.set(false);
    this.isSupplierCreateOpen.set(true);
  }

  onSupplierCreated(s: any): void {
    this.suppliers.set([...this.suppliers(), s]);
    this.selectSupplier(s);
    this.isSupplierCreateOpen.set(false);
    this.showToast(`Proveedor "${this.supplierName(s)}" creado`, 'success');
  }

  onSupplierBlur(): void {
    setTimeout(() => this.supplierDrop.set(false), 150);
  }

  // ── Obligaciones de cobro (CxC) para concepto 20 ──
  receivableFilter = '';

  openReceivablesModal(): void {
    const customerName = this.form.counterpartyName?.trim();
    if (!customerName) {
      this.showToast('Seleccione primero el cliente', 'error');
      return;
    }
    this.receivableFilter = '';
    this.loadingReceivables.set(true);
    this.receivablesModalOpen.set(true);
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
    this.receivablesModalOpen.set(false);
  }

  clearSelectedReceivable(): void {
    this.selectedReceivableId.set('');
  }

  /**
   * Saldo cobrable de la obligación seleccionada. En edición, si sigue siendo
   * la misma CxC, su saldo ya descuenta el cobro de este comprobante.
   */
  receivableAvailable(): number {
    const rec = this.selectedReceivable;
    if (!rec) return 0;
    const editing = this.editingTx();
    const ownPayment = editing && rec.id === this.originalReceivableId ? Number(editing.amount || 0) : 0;
    return Math.round((Number(rec.balanceAmount) + ownPayment) * 100) / 100;
  }

  remainingAfterPayment(): number {
    return Math.round((this.receivableAvailable() - Number(this.form.amount || 0)) * 100) / 100;
  }

  closeReceivablesModal(): void {
    this.receivablesModalOpen.set(false);
  }

  filteredReceivables(): any[] {
    const q = this.receivableFilter.trim().toLowerCase();
    const list = this.receivables();
    if (!q) return list;
    return list.filter((r) =>
      `${r.arNumber || ''} ${r.invoiceNumber || ''}`.toLowerCase().includes(q),
    );
  }

  isReceivableOverdue(rec: any): boolean {
    return (
      rec.status === 'overdue' ||
      (!!rec.dueDate && rec.dueDate < new Date().toISOString().split('T')[0] && Number(rec.balanceAmount) > 0)
    );
  }

  receivableStatus(rec: any): { label: string; css: string } {
    if (rec.status === 'paid') return { label: 'Cobrada', css: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' };
    if (this.isReceivableOverdue(rec)) return { label: 'Vencida', css: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' };
    if (rec.status === 'partial') return { label: 'Parcial', css: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' };
    if (rec.status === 'disputed') return { label: 'En disputa', css: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' };
    return { label: 'Pendiente', css: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' };
  }

  // ── Obligaciones de pago (CxP) para concepto 21 en egresos ──
  /**
   * Concepto "21" = liquidación de obligación de pago (CxP).
   * Aplica en creación y en edición de egresos.
   */
  get isPayableSettlement(): boolean {
    return !this.isIncome && this.form.counterpartConceptCode === '21';
  }

  payables = signal<any[]>([]);
  loadingPayables = signal(false);
  payablesModalOpen = signal(false);
  selectedPayableId = signal<string>('');
  originalPayableId = '';
  payableFilter = '';

  get selectedPayable(): any | null {
    return this.payables().find((p) => p.id === this.selectedPayableId()) || null;
  }

  openPayablesModal(): void {
    const supplierName = this.form.counterpartyName?.trim();
    if (!supplierName) {
      this.showToast('Indique primero el proveedor', 'error');
      return;
    }
    this.payableFilter = '';
    this.loadingPayables.set(true);
    this.payablesModalOpen.set(true);
    this.financeService.getPayables({ supplierName }).subscribe({
      next: (data) => {
        const all = Array.isArray(data) ? data : [];
        const filtered = all.filter((p) => !['paid', 'cancelled'].includes(p.status));
        if (this.originalPayableId && !filtered.some((p) => p.id === this.originalPayableId)) {
          const current = this.payables().find((p) => p.id === this.originalPayableId);
          if (current) filtered.unshift(current);
        }
        this.payables.set(filtered);
        this.loadingPayables.set(false);
      },
      error: () => {
        this.loadingPayables.set(false);
        this.showToast('Error cargando obligaciones de pago', 'error');
      },
    });
  }

  selectPayable(p: any): void {
    this.selectedPayableId.set(p.id);
    if (!this.form.amount || Number(this.form.amount) <= 0) {
      this.form.amount = Number(p.balanceAmount);
    }
    this.payablesModalOpen.set(false);
  }

  clearSelectedPayable(): void {
    this.selectedPayableId.set('');
  }

  /** Saldo pagable de la obligación seleccionada (mismo criterio que la CxC). */
  payableAvailable(): number {
    const p = this.selectedPayable;
    if (!p) return 0;
    const editing = this.editingTx();
    const ownPayment = editing && p.id === this.originalPayableId ? Number(editing.amount || 0) : 0;
    return Math.round((Number(p.balanceAmount) + ownPayment) * 100) / 100;
  }

  payableRemaining(): number {
    return Math.round((this.payableAvailable() - Number(this.form.amount || 0)) * 100) / 100;
  }

  closePayablesModal(): void {
    this.payablesModalOpen.set(false);
  }

  filteredPayables(): any[] {
    const q = this.payableFilter.trim().toLowerCase();
    const list = this.payables();
    if (!q) return list;
    return list.filter((p) =>
      `${p.apNumber || ''} ${p.invoiceNumber || ''} ${p.purchaseNumber || ''}`.toLowerCase().includes(q),
    );
  }

  payableStatus(p: any): { label: string; css: string } {
    if (p.status === 'paid') return { label: 'Saldada', css: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' };
    if (p.status === 'partial') return { label: 'Parcial', css: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' };
    if (p.status === 'overdue' ||
        (!!p.dueDate && p.dueDate < new Date().toISOString().split('T')[0] && Number(p.balanceAmount) > 0)) {
      return { label: 'Vencida', css: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' };
    }
    return { label: 'Pendiente', css: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' };
  }

  /** Carga la CxP ya vinculada al comprobante + las disponibles del proveedor. */
  private loadPayablesForEdit(tx: any): void {
    this.loadingPayables.set(true);
    this.financeService.getLinkedPayable(tx.id).subscribe({
      next: (linked) => {
        const currentAp = linked?.accountPayable || null;
        this.originalPayableId = currentAp?.id || '';
        const query = tx.counterpartyName?.trim();
        const all$ = query ? this.financeService.getPayables({ supplierName: query }) : of([]);
        all$.subscribe({
          next: (all) => {
            const list = (Array.isArray(all) ? all : []).filter(
              (p) => !['paid', 'cancelled'].includes(p.status),
            );
            if (currentAp && !list.some((p) => p.id === currentAp.id)) {
              list.unshift(currentAp);
            }
            this.payables.set(list);
            if (currentAp) this.selectedPayableId.set(currentAp.id);
            this.loadingPayables.set(false);
          },
          error: () => {
            if (currentAp) {
              this.payables.set([currentAp]);
              this.selectedPayableId.set(currentAp.id);
            }
            this.loadingPayables.set(false);
          },
        });
      },
      error: () => {
        this.loadingPayables.set(false);
      },
    });
  }

  // ── Liquidación de anticipos (conceptos 26/27) ──
  isAdvanceTx(tx: any): boolean {
    return ['26', '27'].includes(tx.counterpartConceptCode);
  }

  /** Pendiente del anticipo por liquidar contra obligaciones del tercero. */
  advancePending(tx: any): number {
    return Math.max(
      0,
      Math.round((Number(tx.amount || 0) - Number(tx.advanceAppliedAmount || 0)) * 100) / 100,
    );
  }

  /** Liquidación solo desde las vistas de anticipos, con saldo pendiente. */
  canLiquidateAdvance(tx: any): boolean {
    return (
      !!this.fixedConcept &&
      this.isAdvanceTx(tx) &&
      !this.isCancelled(tx) &&
      this.advancePending(tx) > 0.009
    );
  }

  /** El anticipo ya tiene parte de su importe liquidado. */
  hasAdvanceApplied(tx: any): boolean {
    return Number(tx.advanceAppliedAmount || 0) > 0.009;
  }

  advanceModalOpen = signal(false);
  advanceTx = signal<any | null>(null);
  advanceObligations = signal<any[]>([]);
  advanceApplications = signal<any[]>([]);
  loadingAdvanceData = signal(false);
  applyingAdvance = signal(false);
  undoingApplication = signal<string | null>(null);
  advanceObligationId = signal<string>('');
  advanceAmount = 0;

  get selectedAdvanceObligation(): any | null {
    return this.advanceObligations().find((o) => o.id === this.advanceObligationId()) || null;
  }

  openAdvanceModal(tx: any): void {
    this.advanceTx.set(tx);
    this.advanceObligationId.set('');
    this.advanceAmount = this.advancePending(tx);
    this.advanceObligations.set([]);
    this.advanceApplications.set([]);
    this.advanceModalOpen.set(true);
    this.loadingAdvanceData.set(true);

    const isReceivable = tx.counterpartConceptCode === '26';
    const name = (tx.counterpartyName || '').trim().toLowerCase();
    const obligations$ = isReceivable
      ? this.financeService.getReceivables({ customerName: tx.counterpartyName || undefined })
      : this.financeService.getPayables({ supplierName: tx.counterpartyName || undefined });
    obligations$.subscribe({
      next: (data) => {
        const all = Array.isArray(data) ? data : [];
        const sameParty = (o: any) => {
          if (!name) return true;
          const party = (o.customerName || o.supplierName || '').trim().toLowerCase();
          const nit = (o.customerNit || o.supplierNit || '').trim().toLowerCase();
          return party === name || nit === name;
        };
        this.advanceObligations.set(
          all.filter(
            (o) => sameParty(o) && !['paid', 'written_off', 'cancelled'].includes(o.status),
          ),
        );
        this.loadingAdvanceData.set(false);
      },
      error: () => {
        this.loadingAdvanceData.set(false);
        this.showToast('Error cargando obligaciones del tercero', 'error');
      },
    });
    this.financeService.getAdvanceApplications(tx.id).subscribe({
      next: (apps) => this.advanceApplications.set(Array.isArray(apps) ? apps : []),
      error: () => {},
    });
  }

  closeAdvanceModal(): void {
    this.advanceModalOpen.set(false);
    this.advanceTx.set(null);
    this.advanceObligations.set([]);
    this.advanceApplications.set([]);
    this.advanceObligationId.set('');
  }

  selectAdvanceObligation(o: any): void {
    this.advanceObligationId.set(o.id);
    const tx = this.advanceTx();
    const pending = tx ? this.advancePending(tx) : 0;
    this.advanceAmount = Math.min(pending, Number(o.balanceAmount));
  }

  applyAdvance(): void {
    const tx = this.advanceTx();
    const ob = this.selectedAdvanceObligation;
    if (!tx || !ob || !(Number(this.advanceAmount) > 0)) {
      this.showToast('Seleccione la obligación y el monto a aplicar', 'error');
      return;
    }
    const payload: any = { amount: Number(this.advanceAmount) };
    if (tx.counterpartConceptCode === '26') payload.accountReceivableId = ob.id;
    else payload.accountPayableId = ob.id;

    this.applyingAdvance.set(true);
    this.financeService.applyAdvance(tx.id, payload).subscribe({
      next: () => {
        this.applyingAdvance.set(false);
        this.showToast('Anticipo aplicado a la obligación', 'success');
        this.closeAdvanceModal();
        this.loadTransactions();
      },
      error: (err) => {
        this.applyingAdvance.set(false);
        this.showToast(err?.error?.message || 'Error aplicando el anticipo', 'error');
      },
    });
  }

  async undoAdvanceApplication(app: any): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Deshacer liquidación',
      message: `¿Deshacer la aplicación ${app.paymentNumber} por ${this.formatCurrency(app.amount)}? El saldo volverá al anticipo y a la obligación.`,
      confirmText: 'Deshacer',
      cancelText: 'Volver',
      type: 'warning',
    });
    if (!confirmed) return;
    this.undoingApplication.set(app.id);
    this.financeService.cancelAdvanceApplication(app.id).subscribe({
      next: () => {
        this.undoingApplication.set(null);
        this.showToast('Liquidación deshecha', 'success');
        this.closeAdvanceModal();
        this.loadTransactions();
      },
      error: (err) => {
        this.undoingApplication.set(null);
        this.showToast(err?.error?.message || 'Error deshaciendo la liquidación', 'error');
      },
    });
  }

  // ── Picker de cuentas contables (Carga Inicial) ──
  accountOptions = signal<any[]>([]);
  subaccounts = signal<any[]>([]);
  accountQuery = '';
  accountDrop = signal(false);

  accountSelectOptions = computed(() => {
    const opts: { value: string; label: string; isSub: boolean; parentCode?: string; type?: string }[] = [];
    const subs = this.subaccounts();
    for (const a of this.accountOptions()) {
      if (a.code?.includes('-') || Number(a.level) >= 4) continue;
      const children = subs.filter(s => s.parentCode === a.code || s.code?.startsWith(`${a.code}-`));
      if (!a.allowsMovements && children.length === 0) continue;
      opts.push({ value: a.code, label: `${a.code} - ${a.name}`, isSub: false, type: a.type });
      for (const s of children) {
        const value = s.code?.includes('-') ? s.code : `${a.code}-${s.code}`;
        opts.push({ value, label: `${s.code} - ${s.name}`, isSub: true, parentCode: a.code, type: a.type });
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

  // ── Pickers de cuenta de ingreso y gasto (concepto 19) ──
  incomeAccountQuery = '';
  incomeAccountDrop = signal(false);
  feeAccountQuery = '';
  feeAccountDrop = signal(false);

  typedAccountOptions(accountType: string, query: string) {
    const q = (query || '').toLowerCase();
    const opts = this.accountSelectOptions().filter((o) => o.type === accountType);
    return q ? opts.filter((o) => o.label.toLowerCase().includes(q)) : opts;
  }

  /** Solo cuentas de ingreso; la subcuenta se elige aparte. */
  incomeAccountOptions() {
    return this.typedAccountOptions('income', this.incomeAccountQuery).filter((o) => !o.isSub);
  }

  /** Subcuentas de la cuenta de ingreso seleccionada (la 900 en el concepto 19). */
  incomeSubaccountOptions() {
    const parent = this.form.incomeAccount;
    return parent ? this.accountSelectOptions().filter((o) => o.isSub && o.parentCode === parent) : [];
  }

  /** Subcuentas de la 835 (cuenta de gasto/comisión fijada por el concepto 19). */
  feeSubaccountOptions = computed(() =>
    this.accountSelectOptions().filter((o) => o.isSub && o.parentCode === '835'),
  );

  /** Subcuentas de la 430 (cuenta acreedora fijada por el concepto 26). */
  advanceSubOptions = computed(() =>
    this.accountSelectOptions().filter((o) => o.isSub && o.parentCode === '430'),
  );

  feeAccountOptions() {
    return this.typedAccountOptions('expense', this.feeAccountQuery);
  }

  selectIncomeAccount(value: string): void {
    if (this.form.incomeAccount !== value) this.form.incomeSubaccount = '';
    this.form.incomeAccount = value;
    this.incomeAccountQuery = this.accountingAccountLabel(value);
    this.incomeAccountDrop.set(false);
  }

  selectFeeAccount(value: string): void {
    this.form.feeAccount = value;
    this.feeAccountQuery = this.accountingAccountLabel(value);
    this.feeAccountDrop.set(false);
  }

  onIncomeAccountBlur(): void {
    setTimeout(() => this.incomeAccountDrop.set(false), 150);
  }

  onFeeAccountBlur(): void {
    setTimeout(() => this.feeAccountDrop.set(false), 150);
  }

  selectedBank = computed(() => this.banks().find((b) => b.id === this.selectedBankId()) || null);

  // ── Contabilización de Cargas Iniciales registradas sin comprobante ──
  generatingOpening = signal(false);
  hasOpeningEntries = computed(() =>
    this.isIncome && this.transactions().some((tx) => tx.transactionCode === 'Carga Inicial'),
  );

  generateOpeningVouchers(): void {
    this.generatingOpening.set(true);
    this.financeService.generateMissingOpeningVouchers().subscribe({
      next: (res) => {
        this.generatingOpening.set(false);
        if (res.errors.length) {
          const detail = res.errors.map((e) => `${e.transactionNumber}: ${e.message}`).join(' | ');
          this.showToast(`Generados: ${res.created.length}. Con error: ${detail}`, 'error');
        } else if (res.created.length) {
          this.showToast(`Se generaron ${res.created.length} comprobante(s) en Contabilidad (pendientes de contabilizar)`, 'success');
        } else {
          this.showToast('Todas las Cargas Iniciales ya tienen su comprobante contable', 'success');
        }
      },
      error: (err) => {
        this.generatingOpening.set(false);
        this.showToast(err?.error?.message || 'Error generando los comprobantes', 'error');
      },
    });
  }

  ngOnInit(): void {
    this.loadBanks();
    this.loadCounterpartConcepts();
    this.loadAccountingAccounts();
    this.financeService.getCustomers().subscribe({
      next: (data) => this.customers.set(Array.isArray(data) ? data : []),
      error: () => {},
    });
    this.suppliersService.getAll().subscribe({
      next: (data: any) => this.suppliers.set(Array.isArray(data) ? data : (data?.data ?? data?.items ?? [])),
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
        const list = (Array.isArray(data) ? data : []).filter(
          (t: any) => !this.fixedConcept || t.counterpartConceptCode === this.fixedConcept,
        );
        this.transactions.set(list);
        this.isLoading.set(false);
        if (this.pendingOpenId) {
          const tx = this.transactions().find((t) => t.id === this.pendingOpenId);
          this.pendingOpenId = null;
          if (tx) this.openEditModal(tx);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.showToast('Error cargando transacciones', 'error');
      },
    });
  }

  openViewTx(tx: any): void {
    this.viewTx.set(tx);
    this.isViewOpen.set(true);
  }

  closeViewTx(): void {
    this.isViewOpen.set(false);
    this.viewTx.set(null);
  }

  bankLabelFor(tx: any): string {
    const b = this.banks().find((x) => x.id === tx.bankAccountId);
    return b ? this.bankLabel(b) : tx.bankAccountId || '-';
  }

  isCancelled(tx: any): boolean {
    return tx.operationStatus === 'cancelled';
  }

  /** Solo los comprobantes manuales y vigentes se editan. */
  canEditTx(tx: any): boolean {
    return (
      (tx.sourceModule || 'manual') === 'manual' &&
      !this.isCancelled(tx) &&
      !tx.reconciled
    );
  }

  /**
   * Se anulan los registrados en Finanzas (manuales y los generados por un
   * pago). Los anticipos (26/27) se anulan desde Banco mientras no tengan
   * liquidaciones aplicadas; en sus vistas propias solo se liquidan.
   */
  canCancelTx(tx: any): boolean {
    const source = tx.sourceModule || 'manual';
    const advanceBlocked = this.isAdvanceTx(tx) && (!!this.fixedConcept || this.hasAdvanceApplied(tx));
    return (
      (source === 'manual' || source === 'payment') &&
      !this.isCancelled(tx) &&
      !tx.reconciled &&
      !advanceBlocked
    );
  }

  /** Deshacer anulación: solo comprobantes anulados de origen financiero. */
  canRestoreTx(tx: any): boolean {
    const source = tx.sourceModule || 'manual';
    return this.isCancelled(tx) && (source === 'manual' || source === 'payment');
  }

  /** Explica por qué un comprobante no se puede operar desde aquí. */
  moduleSourceHint(tx: any): string {
    if (this.isCancelled(tx)) return 'Anulado en la operación de origen';
    if (tx.reconciled) return 'Comprobante conciliado en banco';
    if (this.isAdvanceTx(tx) && this.hasAdvanceApplied(tx)) {
      return 'Anticipo con liquidaciones aplicadas: deshágalas desde Cobros/Pagos anticipados antes de anularlo';
    }
    const origins: Record<string, string> = {
      payroll: 'un pago de nómina',
      'fixed-assets': 'una operación de activos fijos',
      transfer: 'una transferencia entre cuentas (espejo)',
      reversal: 'un reverso de comprobante',
      payment: 'un pago registrado',
      cash: 'un depósito desde Caja',
    };
    return `Generado por ${origins[tx.sourceModule] || tx.sourceModule}: anule la operación de origen`;
  }

  openModal(): void {
    this.editingTx.set(null);
    this.resetForm();
    if (this.fixedConcept) {
      this.form.counterpartConceptCode = this.fixedConcept;
      if (this.fixedConcept === '26') {
        this.form.counterpartyAccount = '430';
        this.accountQuery = '430';
      }
    }
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
      incomeAccount: tx.incomeAccount || (tx.counterpartConceptCode === '22' && tx.transactionType === 'credit' ? '950' : ''),
      incomeSubaccount: tx.incomeSubaccount || '',
      feeSubaccount: tx.feeSubaccount || '',
      incomeAmount: Number(tx.incomeAmount || tx.amount || 0),
      feeAccount: tx.feeAccount || '',
      feeAmount: Number(tx.feeAmount || 0),
    };
    this.accountQuery = tx.counterpartyAccount
      ? this.accountingAccountLabel(tx.counterpartyAccount)
      : '';
    this.incomeAccountQuery = this.form.incomeAccount ? this.accountingAccountLabel(this.form.incomeAccount) : '';
    this.feeAccountQuery = tx.feeAccount ? this.accountingAccountLabel(tx.feeAccount) : '';
    this.customerQuery = tx.counterpartyName || '';
    this.supplierQuery = tx.counterpartyName || '';
    this.selectedBankId.set(tx.bankAccountId);
    const bank = this.banks().find((b) => b.id === tx.bankAccountId);
    this.bankQuery = bank ? this.bankLabel(bank) : '';
    this.selectedReceivableId.set('');
    this.originalReceivableId = '';
    this.receivables.set([]);
    this.receivablesModalOpen.set(false);
    this.selectedPayableId.set('');
    this.originalPayableId = '';
    this.payables.set([]);
    this.payablesModalOpen.set(false);
    this.isModalOpen.set(true);

    if (this.isIncome && tx.counterpartConceptCode === '20') {
      this.loadReceivablesForEdit(tx);
    }
    if (!this.isIncome && tx.counterpartConceptCode === '21') {
      this.loadPayablesForEdit(tx);
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
    this.receivablesModalOpen.set(false);
    this.payablesModalOpen.set(false);
    this.isModalOpen.set(false);
    this.editingTx.set(null);
  }

  async cancelTransaction(tx: any): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Anular comprobante',
      message: `¿Anular el comprobante ${tx.transactionNumber}? Se revertirá su efecto en el saldo y podrá deshacerse después.`,
      confirmText: 'Anular',
      cancelText: 'Volver',
      type: 'danger',
    });
    if (!confirmed) return;
    this.financeService.cancelBankTransaction(tx.id).subscribe({
      next: () => {
        this.showToast('Comprobante anulado', 'success');
        this.loadTransactions();
      },
      error: (err) => this.showToast(err?.error?.message || 'Error anulando el comprobante', 'error'),
    });
  }

  async restoreAnnulment(tx: any): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Deshacer anulación',
      message: `¿Deshacer la anulación del comprobante ${tx.transactionNumber}? Se restaurará su efecto en el saldo.`,
      confirmText: 'Deshacer anulación',
      cancelText: 'Volver',
      type: 'info',
    });
    if (!confirmed) return;
    this.financeService.restoreBankTransactionAnnulment(tx.id).subscribe({
      next: () => {
        this.showToast('Anulación deshecha', 'success');
        this.loadTransactions();
      },
      error: (err) => this.showToast(err?.error?.message || 'Error deshaciendo la anulación', 'error'),
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
      if (this.isUsdAccount() && !(Number(this.form.exchangeRate) > 1)) {
        this.showToast('Indique la tasa de cambio de la cuenta en USD', 'error');
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
      if (this.isReceivableSettlement && this.remainingAfterPayment() < -0.009) {
        this.showToast(
          `El monto excede el saldo pendiente de la obligación (${this.formatCurrency(this.receivableAvailable())})`,
          'error',
        );
        return;
      }
      if (this.isPayableSettlement && !this.selectedPayableId()) {
        this.showToast('Seleccione la obligación de pago a liquidar', 'error');
        return;
      }
      if (this.isPayableSettlement && this.payableRemaining() < -0.009) {
        this.showToast(
          `El monto excede el saldo pendiente de la obligación (${this.formatCurrency(this.payableAvailable())})`,
          'error',
        );
        return;
      }
      if (this.isIncomeAccountConcept) {
        if (!this.form.incomeAccount) {
          this.showToast('Seleccione la cuenta de ingreso', 'error');
          return;
        }
        if (!(Number(this.form.incomeAmount) > 0)) {
          this.showToast('Indique el importe del ingreso', 'error');
          return;
        }
        if (this.isOnlinePayment) {
          if (!this.form.feeAccount) {
            this.showToast('Seleccione la cuenta de gasto de la comisión', 'error');
            return;
          }
          if (!(Number(this.form.feeAmount) > 0)) {
            this.showToast('Indique el importe de la comisión bancaria', 'error');
            return;
          }
          if (this.onlineNetAmount <= 0) {
            this.showToast('La comisión no puede ser mayor o igual que el ingreso', 'error');
            return;
          }
        }
        if (this.isUsdAccount() && !(Number(this.form.exchangeRate) > 1)) {
          this.showToast('Indique la tasa de cambio de la cuenta en USD', 'error');
          return;
        }
        // El monto del comprobante es el neto que entra al banco.
        this.form.amount = this.onlineNetAmount;
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
      // Conceptos anticipados (26/27): la contrapartida contable sí se envía
      // (el 26 la fija en la 430 acreedora del cobro anticipado).
      basePayload.counterpartyAccount = ['26', '27'].includes(this.form.counterpartConceptCode)
        ? this.form.counterpartyAccount || null
        : null;
      basePayload.counterpartyName = this.form.counterpartyName || null;

      if (this.isAdvanceCollection) {
        basePayload.incomeSubaccount = this.form.incomeSubaccount || null;
      }

      if (this.isIncomeAccountConcept) {
        basePayload.incomeAccount = this.form.incomeAccount;
        basePayload.incomeSubaccount = this.form.incomeSubaccount || null;
        basePayload.feeSubaccount = this.isOnlinePayment ? this.form.feeSubaccount || null : null;
        basePayload.incomeAmount = Number(this.form.incomeAmount);
        basePayload.feeAccount = this.isOnlinePayment ? this.form.feeAccount : null;
        basePayload.feeAmount = this.isOnlinePayment ? Number(this.form.feeAmount) : null;
      } else {
        basePayload.incomeAccount = null;
        basePayload.incomeAmount = null;
        basePayload.feeAccount = null;
        basePayload.feeAmount = null;
      }

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
      const wasPayable = editing?.counterpartConceptCode === '21';
      const isPayableNow = this.isPayableSettlement;
      if (wasPayable || isPayableNow) {
        basePayload.accountPayableId = isPayableNow
          ? this.selectedPayableId() || null
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
      incomeAccount: '',
    incomeSubaccount: '',
    feeSubaccount: '',
      incomeAmount: 0,
      feeAccount: '',
      feeAmount: 0,
    };
    this.accountQuery = '';
    this.incomeAccountQuery = '';
    this.feeAccountQuery = '';
    this.customerQuery = '';
    this.supplierQuery = '';
    this.bankQuery = '';
    this.selectedReceivableId.set('');
    this.originalReceivableId = '';
    this.receivables.set([]);
    this.receivablesModalOpen.set(false);
    this.selectedPayableId.set('');
    this.originalPayableId = '';
    this.payables.set([]);
    this.payablesModalOpen.set(false);
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