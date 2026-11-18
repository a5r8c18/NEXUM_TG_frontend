import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FinanceService } from '../../../core/services/finance.service';
import { SuppliersService } from '../../../core/services/suppliers.service';
import { HrService } from '../../../core/services/hr.service';
import { AccountingService } from '../../../core/services/accounting.service';
import { AuthService } from '../../../core/services/auth.service';
import { CustomerQuickCreateComponent } from '../../../shared/components/quick-create/customer-quick-create.component';
import { SupplierQuickCreateComponent } from '../../../shared/components/quick-create/supplier-quick-create.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

type DocumentKind = 'recibo_ingreso' | 'otros_cobros' | 'liquidacion_cobro' | 'liquidacion_pago';
type ThirdPartyType = 'customer' | 'supplier' | 'employee';

@Component({
  selector: 'app-cash-movements',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomerQuickCreateComponent, SupplierQuickCreateComponent, ModalComponent],
  templateUrl: './cash-movements.component.html',
})
export class CashMovementsComponent implements OnInit {
  private financeService = inject(FinanceService);
  private suppliersService = inject(SuppliersService);
  private hrService = inject(HrService);
  private accountingService = inject(AccountingService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private confirmDialog = inject(ConfirmDialogService);

  type = this.route.snapshot.data['type'] as 'income' | 'expense';
  isIncome = this.type === 'income';
  pageTitle = this.isIncome ? 'Caja - Ingreso' : 'Caja - Egreso';

  registers = signal<any[]>([]);
  selectedRegisterId = signal<string>('');
  movements = signal<any[]>([]);
  isLoading = signal(false);
  saving = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);

  form = this.emptyForm();

  private emptyForm() {
    return {
      documentType: '',
      movementDate: new Date().toISOString().split('T')[0],
      amount: 0,
      description: '',
      counterpartyName: '',
      concept: '',
      ...this.emptyReceipt(),
    };
  }

  private emptyReceipt() {
    return {
      exchangeRate: 1,
      receiptNumber: '',
      deliveredBy: '',
      issueDate: new Date().toISOString().split('T')[0],
      receivedBy: '',
      performedBy: '',
      counterpartAccount: '',
      counterpartSubaccount: '',
    };
  }

  selectedRegister = computed(() => this.registers().find(r => r.id === this.selectedRegisterId()) || null);

  // ── Recibo de ingreso y Liquidación de documentos de cobro ──
  get isReceipt(): boolean {
    return this.isIncome && this.form.documentType === 'recibo_ingreso';
  }

  get isCollection(): boolean {
    return this.isIncome && this.form.documentType === 'liquidacion_cobro';
  }

  get isOtherCollection(): boolean {
    return this.isIncome && this.form.documentType === 'otros_cobros';
  }

  get isPaymentSettlement(): boolean {
    return !this.isIncome && this.form.documentType === 'liquidacion_pago';
  }

  /** Liquidación de documentos (cobro o pago): pide moneda y muestra la cuenta de la caja. */
  get isDocumentSettlement(): boolean {
    return this.isCollection || this.isPaymentSettlement;
  }

  /** Tipos con datos de documento y cuenta de contrapartida. */
  get hasDocumentFields(): boolean {
    return this.isReceipt || this.isOtherCollection || this.isDocumentSettlement;
  }

  /** Tipo de documento del formulario, para validar con las reglas de cada uno. */
  private documentKind(type: string): DocumentKind {
    return ['liquidacion_cobro', 'liquidacion_pago', 'otros_cobros'].includes(type)
      ? (type as DocumentKind)
      : 'recibo_ingreso';
  }

  /** Usuario actual, propuesto como "Elaborado por". */
  private currentUserName(): string {
    const u: any = this.authService.currentUser();
    if (!u) return '';
    return `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || '';
  }

  /** Cuenta de efectivo de la caja: la que el usuario vinculó al fondo. */
  cashAccountLabel(): string {
    const code = this.selectedRegister()?.accountingAccount;
    if (!code) return 'Sin cuenta asignada (asígnela en Cajas)';
    const sub = this.subaccounts().find((s) => s.code === code);
    return sub ? `${code} - ${sub.name}` : this.accountLabel(code);
  }

  /** La tasa solo aplica en cajas en USD; en el resto es 1. */
  isUsdRegister(): boolean {
    return this.selectedRegister()?.currency === 'USD';
  }

  montoCup(amount: number, rate: number): number {
    return Math.round(Number(amount || 0) * (this.isUsdRegister() ? Number(rate || 0) : 1) * 100) / 100;
  }

  /**
   * Tercero de los comprobantes con documento: en ingresos cliente o
   * trabajador; en la liquidación de pago proveedor, cliente o trabajador.
   */
  thirdPartyType: ThirdPartyType = this.defaultThirdParty();
  employees = signal<any[]>([]);
  /** Clientes en Caja - Egreso (en ingresos ya están en `parties`). */
  customers = signal<any[]>([]);

  private defaultThirdParty(): ThirdPartyType {
    return this.isIncome ? 'customer' : 'supplier';
  }

  thirdPartyOptions(): { value: ThirdPartyType; label: string }[] {
    return this.isIncome
      ? [{ value: 'customer', label: 'Cliente' }, { value: 'employee', label: 'Empleado' }]
      : [{ value: 'supplier', label: 'Proveedor' }, { value: 'customer', label: 'Cliente' }, { value: 'employee', label: 'Empleado' }];
  }

  setThirdPartyType(kind: ThirdPartyType): void {
    if (this.thirdPartyType === kind) return;
    this.thirdPartyType = kind;
    this.form.counterpartyName = '';
    this.selectedObligationId = '';
    this.obligations.set([]);
  }

  /** Tipo de tercero efectivo: el elegido en los comprobantes con documento, o el del sentido. */
  private get partyKind(): ThirdPartyType {
    return this.hasDocumentFields ? this.thirdPartyType : this.defaultThirdParty();
  }

  /** Lista del buscador según el tipo de tercero. */
  activeParties(): any[] {
    const kind = this.partyKind;
    if (kind === 'employee') {
      return this.employees().map((e) => ({ id: e.id, name: `${e.firstName || ''} ${e.lastName || ''}`.trim(), code: e.employeeCode }));
    }
    return kind === 'customer' && !this.isIncome ? this.customers() : this.parties();
  }

  partyLabel(): string {
    return { employee: 'Trabajador', supplier: 'Proveedor', customer: 'Cliente/Entidad' }[this.partyKind];
  }

  /** Ficha de alta rápida que corresponde al tipo de tercero (no hay alta de trabajadores). */
  partyCreateKind(): 'customer' | 'supplier' | null {
    const kind = this.partyKind;
    return kind === 'employee' ? null : kind;
  }

  // Cuenta de contrapartida y su subcuenta.
  accountOptions = signal<any[]>([]);
  subaccounts = signal<any[]>([]);
  counterpartQuery = '';
  counterpartDrop = signal(false);
  editCounterpartQuery = '';
  editCounterpartDrop = signal(false);

  /** Cuentas postables o con subcuentas (las subcuentas se eligen aparte). */
  private postableAccounts = computed(() => {
    const subs = this.subaccounts();
    return this.accountOptions().filter((a) => {
      if (a.code?.includes('-') || Number(a.level) >= 4) return false;
      return a.allowsMovements || subs.some((s) => s.parentCode === a.code || s.code?.startsWith(`${a.code}-`));
    });
  });

  counterpartOptions(query: string): any[] {
    const q = (query || '').toLowerCase();
    const list = this.postableAccounts();
    return q ? list.filter((a) => `${a.code} - ${a.name}`.toLowerCase().includes(q)) : list;
  }

  counterpartSubOptions(parent: string): { value: string; label: string }[] {
    if (!parent) return [];
    return this.subaccounts()
      .filter((s) => s.parentCode === parent || s.code?.startsWith(`${parent}-`))
      .map((s) => ({ value: s.code?.includes('-') ? s.code : `${parent}-${s.code}`, label: `${s.code} - ${s.name}` }));
  }

  accountLabel(code: string): string {
    if (!code) return '';
    const a = this.accountOptions().find((x) => x.code === code);
    return a ? `${a.code} - ${a.name}` : code;
  }

  selectCounterpart(target: any, code: string, which: 'form' | 'edit'): void {
    if (target.counterpartAccount !== code) target.counterpartSubaccount = '';
    target.counterpartAccount = code;
    if (which === 'form') {
      this.counterpartQuery = this.accountLabel(code);
      this.counterpartDrop.set(false);
    } else {
      this.editCounterpartQuery = this.accountLabel(code);
      this.editCounterpartDrop.set(false);
    }
  }

  onCounterpartBlur(which: 'form' | 'edit'): void {
    setTimeout(() => (which === 'form' ? this.counterpartDrop : this.editCounterpartDrop).set(false), 150);
  }

  /** Valida los datos del recibo o de la liquidación; devuelve el mensaje de error o null. */
  private receiptError(r: any, kind: DocumentKind = 'recibo_ingreso'): string | null {
    const isReceipt = kind === 'recibo_ingreso';
    if (!r.counterpartyName?.trim()) {
      return kind === 'liquidacion_pago' ? 'Indique el proveedor, cliente o trabajador' : 'Indique el cliente o trabajador';
    }
    if (this.isUsdRegister() && !(Number(r.exchangeRate) > 1)) return 'La caja es en USD: indique la tasa de cambio';
    if (!r.receiptNumber?.trim()) return isReceipt ? 'Indique el número de recibo' : 'Indique el número de documento';
    if (isReceipt && !r.deliveredBy?.trim()) return 'Indique quién entrega el efectivo';
    if (kind === 'otros_cobros' && !r.performedBy?.trim()) return 'Indique quién elabora el documento';
    if (!r.issueDate) return 'Indique la fecha de emisión';
    if (isReceipt && !r.receivedBy?.trim()) return 'Indique quién recibe el efectivo';
    if (!r.counterpartAccount) return 'Seleccione la cuenta de contrapartida';
    if (!r.counterpartSubaccount && this.counterpartSubOptions(r.counterpartAccount).length) {
      return `La cuenta ${r.counterpartAccount} tiene subcuentas: seleccione una`;
    }
    return null;
  }

  private receiptPayload(r: any) {
    return {
      exchangeRate: this.isUsdRegister() ? Number(r.exchangeRate) : 1,
      receiptNumber: r.receiptNumber,
      deliveredBy: r.deliveredBy,
      issueDate: r.issueDate,
      receivedBy: r.receivedBy,
      performedBy: r.performedBy,
      counterpartAccount: r.counterpartAccount,
      counterpartSubaccount: r.counterpartSubaccount || null,
    };
  }

  /** Tipos de comprobante de caja por sentido. */
  private static readonly DOCUMENT_TYPES: Record<'income' | 'expense', { value: string; label: string }[]> = {
    income: [
      { value: 'carga_inicial', label: 'Carga inicial' },
      { value: 'recibo_ingreso', label: 'Recibo de ingresos' },
      { value: 'liquidacion_cobro', label: 'Liquidación de documentos de cobro' },
      { value: 'otros_cobros', label: 'Otros cobros' },
    ],
    expense: [
      { value: 'liquidacion_pago', label: 'Liquidación de documento de pago' },
      { value: 'deposito_cuenta', label: 'Modelo de depósito en cuenta' },
      { value: 'modelo_dieta', label: 'Modelo de dieta' },
      { value: 'otros_pagos', label: 'Otros pagos' },
    ],
  };
  documentTypes = CashMovementsComponent.DOCUMENT_TYPES[this.type];

  /** Nombres de los tipos generados por el sistema o anteriores a este catálogo. */
  private static readonly LEGACY_DOCUMENT_TYPES: Record<string, string> = {
    recibo_cobro: 'Recibo de cobro',
    vale_caja: 'Vale de caja',
    apertura: 'Apertura',
    cierre: 'Cierre',
    arqueo: 'Arqueo',
    deposito_banco: 'Depósito a banco',
  };

  documentTypeLabel(value: string | null | undefined): string {
    if (!value) return '-';
    const all = [...CashMovementsComponent.DOCUMENT_TYPES.income, ...CashMovementsComponent.DOCUMENT_TYPES.expense];
    return all.find((t) => t.value === value)?.label ?? CashMovementsComponent.LEGACY_DOCUMENT_TYPES[value] ?? value;
  }

  // ── Liquidación de documentos de cobro (CxC) / de pago (CxP) ──
  get isSettlement(): boolean {
    return this.form.documentType === 'liquidacion_cobro' || this.form.documentType === 'liquidacion_pago';
  }

  obligations = signal<any[]>([]);
  loadingObligations = signal(false);
  selectedObligationId = '';

  get selectedObligation(): any | null {
    return this.obligations().find((o) => o.id === this.selectedObligationId) || null;
  }

  obligationNumber(o: any): string {
    return o?.arNumber || o?.apNumber || '';
  }

  /** Carga las CxC del cliente o CxP del proveedor con saldo pendiente. */
  loadObligations(): void {
    this.selectedObligationId = '';
    this.obligations.set([]);
    const name = this.form.counterpartyName?.trim();
    if (!this.isSettlement || !name) return;
    this.loadingObligations.set(true);
    const obs$ = this.isIncome
      ? this.financeService.getReceivables({ customerName: name })
      : this.financeService.getPayables({ supplierName: name });
    obs$.subscribe({
      next: (data: any) => {
        const all = Array.isArray(data) ? data : [];
        this.obligations.set(all.filter((o) => !['paid', 'written_off', 'cancelled'].includes(o.status)));
        this.loadingObligations.set(false);
      },
      error: () => {
        this.loadingObligations.set(false);
        this.showToast('Error cargando las obligaciones', 'error');
      },
    });
  }

  onObligationChange(): void {
    const o = this.selectedObligation;
    if (o) this.form.amount = Number(o.balanceAmount);
  }

  // ── Modelo de depósito en cuenta: banco que recibe el efectivo ──
  get isDeposit(): boolean {
    return this.form.documentType === 'deposito_cuenta';
  }

  banks = signal<any[]>([]);
  depositBankAccountId = '';

  /** Cuentas activas en la moneda de la caja seleccionada. */
  depositBanks = computed(() => {
    const currency = this.selectedRegister()?.currency || 'CUP';
    return this.banks().filter((b) => b.status !== 'closed' && (b.currency || 'CUP') === currency);
  });

  onDocumentTypeChange(): void {
    this.depositBankAccountId = '';
    if (this.hasDocumentFields) {
      this.form.concept = '';
      if (this.isReceipt && !this.form.receivedBy) this.form.receivedBy = this.selectedRegister()?.responsibleName || '';
      if (this.isOtherCollection && !this.form.performedBy) this.form.performedBy = this.currentUserName();
    } else {
      Object.assign(this.form, this.emptyReceipt());
      this.counterpartQuery = '';
      if (this.thirdPartyType !== this.defaultThirdParty()) this.form.counterpartyName = '';
      this.thirdPartyType = this.defaultThirdParty();
    }
    this.loadObligations();
  }

  /** Conceptos de Caja - Ingreso: 24, 80 y 81. */
  private static readonly CASH_INCOME_CONCEPTS = ['24', '80', '81'];
  concepts = signal<any[]>([]);
  incomeConcepts = computed(() =>
    this.concepts().filter((c) => CashMovementsComponent.CASH_INCOME_CONCEPTS.includes(c.code)),
  );

  /** Muestra "código — nombre"; los conceptos antiguos en texto libre se muestran tal cual. */
  conceptLabel(value: string | null | undefined): string {
    if (!value) return '-';
    const c = this.concepts().find((x) => x.code === value);
    return c ? `${c.code} — ${c.name}` : value;
  }

  ngOnInit(): void {
    this.loadRegisters();
    this.financeService.getCounterpartConcepts().subscribe({
      next: (data: any) => this.concepts.set(Array.isArray(data) ? data : []),
      error: () => {},
    });
    if (!this.isIncome) {
      this.financeService.getBanks().subscribe({
        next: (data: any) => this.banks.set(Array.isArray(data) ? data : []),
        error: () => {},
      });
    }
    const parties$ = this.isIncome ? this.financeService.getCustomers() : this.suppliersService.getAll();
    parties$.subscribe({
      next: (data: any) => this.parties.set(Array.isArray(data) ? data : (data?.data ?? data?.items ?? [])),
      error: () => {},
    });
    if (!this.isIncome) {
      this.financeService.getCustomers().subscribe({
        next: (data: any) => this.customers.set(Array.isArray(data) ? data : []),
        error: () => {},
      });
    }
    this.hrService.getEmployees({ status: 'active' }).subscribe({
      next: (data) => this.employees.set(Array.isArray(data) ? data : []),
      error: () => {},
    });
    this.accountingService.getAccounts({ activeOnly: 'true' }).subscribe({
      next: (accounts: any) => this.accountOptions.set(Array.isArray(accounts) ? accounts : []),
      error: () => {},
    });
    this.accountingService.getSubaccounts().subscribe({
      next: (subs: any) => this.subaccounts.set(Array.isArray(subs) ? subs : []),
      error: () => {},
    });
  }

  // ── Buscador de contraparte: clientes en ingresos, proveedores en egresos ──
  parties = signal<any[]>([]);
  partyDrop = signal(false);
  isPartyCreateOpen = signal(false);

  partyName(p: any): string {
    return p?.name || p?.businessName || p?.tradeName || '';
  }

  filteredParties(query: string): any[] {
    const q = (query || '').toLowerCase();
    const list = this.activeParties();
    return q
      ? list.filter((p) =>
          [this.partyName(p), p.tradeName, p.code, p.supplierCode, p.taxId, p.nit].some((v) => v?.toLowerCase().includes(q)),
        )
      : list;
  }

  partyExists(query: string): boolean {
    const q = (query || '').trim().toLowerCase();
    return this.activeParties().some((p) => this.partyName(p).toLowerCase() === q);
  }

  /** El alta rápida solo existe para clientes y proveedores. */
  canCreateParty(): boolean {
    return this.partyCreateKind() !== null;
  }

  selectParty(p: any): void {
    this.form.counterpartyName = this.partyName(p);
    this.partyDrop.set(false);
    if (this.isReceipt && !this.form.deliveredBy.trim()) this.form.deliveredBy = this.form.counterpartyName;
    this.loadObligations();
  }

  onPartyBlur(): void {
    setTimeout(() => this.partyDrop.set(false), 150);
  }

  onPartyInput(value: string): void {
    this.form.counterpartyName = value;
    this.partyDrop.set(true);
    // Al cambiar el tercero, la obligación elegida deja de corresponder.
    if (this.selectedObligationId || this.obligations().length) {
      this.selectedObligationId = '';
      this.obligations.set([]);
    }
  }

  createPartyInline(): void {
    this.partyDrop.set(false);
    this.isPartyCreateOpen.set(true);
  }

  onPartyCreated(p: any): void {
    const isCustomer = this.partyCreateKind() === 'customer';
    const list = isCustomer && !this.isIncome ? this.customers : this.parties;
    list.set([...list(), p]);
    this.selectParty(p);
    this.isPartyCreateOpen.set(false);
    this.showToast(`${isCustomer ? 'Cliente' : 'Proveedor'} "${this.partyName(p)}" creado`, 'success');
  }

  /** Carga las cajas y, con ellas, los comprobantes de todas (como Banco con sus cuentas). */
  loadRegisters(): void {
    this.isLoading.set(true);
    this.financeService.getCashRegisters().subscribe({
      next: (data) => {
        this.registers.set(Array.isArray(data) ? data : []);
        this.loadMovements();
      },
      error: () => {
        this.isLoading.set(false);
        this.showToast('Error cargando cajas', 'error');
      },
    });
  }

  loadMovements(): void {
    const registers = this.registers();
    if (!registers.length) {
      this.movements.set([]);
      this.isLoading.set(false);
      return;
    }
    this.isLoading.set(true);
    forkJoin(registers.map((r) => this.financeService.getCashMovements(r.id, { movementType: this.type }))).subscribe({
      next: (lists: any[]) => {
        const all = lists.flatMap((l) => (Array.isArray(l) ? l : []));
        all.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
        this.movements.set(all);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.showToast('Error cargando movimientos', 'error');
      },
    });
  }

  registerLabel(cr: any): string {
    return cr ? `${cr.registerName} (${cr.registerCode}) · ${cr.currency || 'CUP'}` : '';
  }

  registerLabelFor(m: any): string {
    const cr = this.registers().find((r) => r.id === m.cashRegisterId);
    return cr ? `${cr.registerName} (${cr.registerCode})` : '-';
  }

  // ── Modal de nuevo comprobante (como Banco) ──
  isModalOpen = signal(false);
  registerQuery = '';
  registerDrop = signal(false);

  filteredRegisters(query: string): any[] {
    const q = (query || '').toLowerCase();
    const list = this.registers();
    return q ? list.filter((r) => this.registerLabel(r).toLowerCase().includes(q)) : list;
  }

  selectRegister(cr: any): void {
    if (this.selectedRegisterId() !== cr.id) {
      this.depositBankAccountId = '';
      if (cr.currency !== 'USD') this.form.exchangeRate = 1;
    }
    this.selectedRegisterId.set(cr.id);
    this.registerQuery = this.registerLabel(cr);
    this.registerDrop.set(false);
    if (this.isReceipt && !this.form.receivedBy) this.form.receivedBy = cr.responsibleName || '';
  }

  onRegisterBlur(): void {
    setTimeout(() => this.registerDrop.set(false), 150);
  }

  openModal(): void {
    this.resetForm();
    // Caja propuesta: la predeterminada abierta, o la primera abierta.
    const open = this.registers().filter((r) => r.status === 'open');
    const preferred = open.find((r) => r.isDefault) || open[0];
    this.selectedRegisterId.set('');
    this.registerQuery = '';
    if (preferred) this.selectRegister(preferred);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  // ── Detalle (solo lectura) ──
  viewMovement = signal<any | null>(null);

  openView(m: any): void {
    this.viewMovement.set(m);
  }

  counterpartLabel(m: any): string {
    if (m.counterpartAccount) {
      const sub = m.counterpartSubaccount ? this.subaccounts().find((s) => s.code === m.counterpartSubaccount) : null;
      return sub ? `${this.accountLabel(m.counterpartAccount)} → ${sub.code} - ${sub.name}` : this.accountLabel(m.counterpartAccount);
    }
    return m.concept ? this.conceptLabel(m.concept) : '-';
  }

  submit(): void {
    const id = this.selectedRegisterId();
    if (!id) {
      this.showToast('Seleccione la caja', 'error');
      return;
    }
    if (!this.form.documentType) {
      this.showToast('Seleccione el tipo de comprobante', 'error');
      return;
    }
    if (!this.form.description?.trim() || !this.form.amount || Number(this.form.amount) <= 0) {
      this.showToast('Monto y descripción son obligatorios', 'error');
      return;
    }
    if (this.isSettlement) {
      const o = this.selectedObligation;
      if (!o) {
        this.showToast(this.isIncome ? 'Seleccione la cuenta por cobrar a liquidar' : 'Seleccione la cuenta por pagar a liquidar', 'error');
        return;
      }
      if (Number(this.form.amount) - Number(o.balanceAmount) > 0.009) {
        this.showToast(`El monto excede el saldo pendiente de ${this.obligationNumber(o)} (${this.formatCurrency(o.balanceAmount)})`, 'error');
        return;
      }
    }
    if (this.isDeposit && !this.depositBankAccountId) {
      this.showToast('Seleccione la cuenta bancaria donde se deposita', 'error');
      return;
    }
    if (this.hasDocumentFields) {
      if (!this.selectedRegister()?.accountingAccount) {
        this.showToast('La caja no tiene cuenta contable asignada. Asígnela en Cajas.', 'error');
        return;
      }
      const error = this.receiptError(this.form, this.documentKind(this.form.documentType));
      if (error) {
        this.showToast(error, 'error');
        return;
      }
    }

    this.saving.set(true);
    this.financeService.createCashMovement(id, {
      movementType: this.type,
      documentType: this.form.documentType,
      movementDate: this.form.movementDate,
      amount: Number(this.form.amount),
      description: this.form.description,
      counterpartyName: this.form.counterpartyName || undefined,
      concept: this.form.concept || undefined,
      ...(this.isSettlement
        ? this.isIncome
          ? { accountReceivableId: this.selectedObligationId }
          : { accountPayableId: this.selectedObligationId }
        : {}),
      ...(this.isDeposit ? { bankAccountId: this.depositBankAccountId } : {}),
      ...(this.hasDocumentFields ? this.receiptPayload(this.form) : {}),
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.showToast(this.isIncome ? 'Ingreso registrado' : 'Egreso registrado', 'success');
        this.closeModal();
        this.resetForm();
        this.loadRegisters();
      },
      error: (err) => {
        this.saving.set(false);
        this.showToast(err?.error?.message || 'Error guardando el movimiento', 'error');
      },
    });
  }

  resetForm(): void {
    this.selectedObligationId = '';
    this.obligations.set([]);
    this.depositBankAccountId = '';
    this.form = this.emptyForm();
    this.counterpartQuery = '';
    this.thirdPartyType = this.defaultThirdParty();
  }

  // ── Edición y anulación de comprobantes ──
  private static readonly LINKED_TYPES = ['liquidacion_cobro', 'liquidacion_pago', 'deposito_cuenta', 'deposito_banco'];

  isCancelled(m: any): boolean {
    return m?.status === 'cancelled';
  }

  /** Liquidaciones, cobros/pagos desde Pagos y depósitos: no cambian de tipo. */
  isLinkedMovement(m: any): boolean {
    return !!m?.paymentId || CashMovementsComponent.LINKED_TYPES.includes(m?.documentType);
  }

  editingMovement = signal<any | null>(null);
  editForm = {
    documentType: '', movementDate: '', amount: 0, counterpartyName: '', concept: '', description: '',
    ...this.emptyReceipt(),
  };

  get isEditReceipt(): boolean {
    return this.editForm.documentType === 'recibo_ingreso';
  }

  /** Liquidación de documentos de cobro o de pago. */
  get isEditCollection(): boolean {
    return ['liquidacion_cobro', 'liquidacion_pago'].includes(this.editForm.documentType);
  }

  get isEditOther(): boolean {
    return this.editForm.documentType === 'otros_cobros';
  }

  get isEditDocument(): boolean {
    return this.isEditReceipt || this.isEditCollection || this.isEditOther;
  }

  openEdit(m: any): void {
    this.viewMovement.set(null);
    // La moneda y la tasa del movimiento son las de su caja.
    this.selectedRegisterId.set(m.cashRegisterId);
    this.editingMovement.set(m);
    this.editForm = {
      documentType: m.documentType || '',
      movementDate: String(m.movementDate || '').substring(0, 10),
      amount: Number(m.amount),
      counterpartyName: m.counterpartyName || '',
      concept: m.concept || '',
      description: m.description || '',
      exchangeRate: Number(m.exchangeRate || 1),
      receiptNumber: m.receiptNumber || '',
      deliveredBy: m.deliveredBy || '',
      issueDate: m.issueDate ? String(m.issueDate).substring(0, 10) : '',
      receivedBy: m.receivedBy || '',
      performedBy: m.performedBy || '',
      counterpartAccount: m.counterpartAccount || '',
      counterpartSubaccount: m.counterpartSubaccount || '',
    };
    this.editCounterpartQuery = this.accountLabel(this.editForm.counterpartAccount);
  }

  /**
   * Tipos disponibles al editar: el actual (aunque sea de los anteriores) y los del mismo sentido.
   * El Recibo de ingreso y Otros cobros llevan asiento propio y no se convierten en otro tipo (ni al revés).
   */
  editDocumentTypes(): { value: string; label: string }[] {
    const current = this.editForm.documentType;
    const ownVoucher = ['recibo_ingreso', 'otros_cobros'];
    if (ownVoucher.includes(current)) return [{ value: current, label: this.documentTypeLabel(current) }];
    const list = this.documentTypes.filter(
      (t) => !CashMovementsComponent.LINKED_TYPES.includes(t.value) && !ownVoucher.includes(t.value),
    );
    return current && !list.some((t) => t.value === current)
      ? [{ value: current, label: this.documentTypeLabel(current) }, ...list]
      : list;
  }

  saveEdit(): void {
    const m = this.editingMovement();
    if (!m) return;
    if (!this.editForm.description?.trim() || !(Number(this.editForm.amount) > 0)) {
      this.showToast('Monto y descripción son obligatorios', 'error');
      return;
    }
    // Los recibos y liquidaciones anteriores sin contrapartida pueden seguir editándose sin ella.
    const receiptWithVoucher = this.isEditDocument && !!this.editForm.counterpartAccount;
    if (receiptWithVoucher) {
      const error = this.receiptError(this.editForm, this.documentKind(this.editForm.documentType));
      if (error) {
        this.showToast(error, 'error');
        return;
      }
    }
    this.saving.set(true);
    const linked = this.isLinkedMovement(m);
    // La fecha solo se envía si cambió el día, para no perder la hora original.
    const dateChanged = this.editForm.movementDate !== String(m.movementDate || '').substring(0, 10);
    this.financeService.updateCashMovement(m.id, {
      ...(dateChanged ? { movementDate: this.editForm.movementDate } : {}),
      amount: Number(this.editForm.amount),
      description: this.editForm.description,
      concept: this.editForm.concept || null,
      ...(linked ? {} : { documentType: this.editForm.documentType, counterpartyName: this.editForm.counterpartyName || null }),
      ...(receiptWithVoucher ? this.receiptPayload(this.editForm) : {}),
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.editingMovement.set(null);
        this.showToast('Movimiento actualizado', 'success');
        this.refreshAfterChange();
      },
      error: (err) => {
        this.saving.set(false);
        this.showToast(err?.error?.message || 'Error actualizando el movimiento', 'error');
      },
    });
  }

  async cancelMovement(m: any): Promise<void> {
    const effects = [
      m.paymentId ? 'se revierte la cuenta por cobrar/pagar que liquidó y se anula su comprobante contable' : '',
      ['deposito_cuenta', 'deposito_banco'].includes(m.documentType) ? 'se anula el ingreso que generó en Banco' : '',
    ].filter(Boolean);
    const confirmed = await this.confirmDialog.confirm({
      title: 'Anular movimiento de caja',
      message:
        `¿Anular el movimiento ${m.movementNumber}? Se devuelve su efecto en el saldo de la caja` +
        (effects.length ? `; además ${effects.join(' y ')}` : '') +
        '. Podrá deshacer la anulación.',
      confirmText: 'Anular',
      type: 'danger',
    });
    if (!confirmed) return;
    this.financeService.cancelCashMovement(m.id).subscribe({
      next: () => {
        this.showToast(`Movimiento ${m.movementNumber} anulado`, 'success');
        this.refreshAfterChange();
      },
      error: (err) => this.showToast(err?.error?.message || 'Error anulando el movimiento', 'error'),
    });
  }

  restoreMovement(m: any): void {
    this.financeService.restoreCashMovement(m.id).subscribe({
      next: () => {
        this.showToast(`Anulación de ${m.movementNumber} deshecha`, 'success');
        this.refreshAfterChange();
      },
      error: (err) => this.showToast(err?.error?.message || 'Error deshaciendo la anulación', 'error'),
    });
  }

  /** Recarga cajas (saldo) y movimientos tras editar o anular. */
  private refreshAfterChange(): void {
    this.loadRegisters();
    this.loadMovements();
  }

  showToast(message: string, type: 'success' | 'error'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }

  formatCurrency(value: number): string {
    return Number(value || 0).toLocaleString('es-CU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
