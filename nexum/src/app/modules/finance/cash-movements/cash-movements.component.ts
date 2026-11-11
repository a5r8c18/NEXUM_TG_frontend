import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FinanceService } from '../../../core/services/finance.service';
import { SuppliersService } from '../../../core/services/suppliers.service';
import { CustomerQuickCreateComponent } from '../../../shared/components/quick-create/customer-quick-create.component';
import { SupplierQuickCreateComponent } from '../../../shared/components/quick-create/supplier-quick-create.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-cash-movements',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomerQuickCreateComponent, SupplierQuickCreateComponent, ModalComponent],
  templateUrl: './cash-movements.component.html',
})
export class CashMovementsComponent implements OnInit {
  private financeService = inject(FinanceService);
  private suppliersService = inject(SuppliersService);
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

  form = {
    documentType: '',
    movementDate: new Date().toISOString().split('T')[0],
    amount: 0,
    description: '',
    counterpartyName: '',
    concept: '',
  };

  selectedRegister = computed(() => this.registers().find(r => r.id === this.selectedRegisterId()) || null);

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
    const list = this.parties();
    return q
      ? list.filter((p) =>
          [this.partyName(p), p.tradeName, p.code, p.supplierCode, p.taxId, p.nit].some((v) => v?.toLowerCase().includes(q)),
        )
      : list;
  }

  partyExists(query: string): boolean {
    const q = (query || '').trim().toLowerCase();
    return this.parties().some((p) => this.partyName(p).toLowerCase() === q);
  }

  selectParty(p: any): void {
    this.form.counterpartyName = this.partyName(p);
    this.partyDrop.set(false);
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
    this.parties.set([...this.parties(), p]);
    this.selectParty(p);
    this.isPartyCreateOpen.set(false);
    this.showToast(`${this.isIncome ? 'Cliente' : 'Proveedor'} "${this.partyName(p)}" creado`, 'success');
  }

  loadRegisters(): void {
    this.isLoading.set(true);
    this.financeService.getCashRegisters().subscribe({
      next: (data) => {
        this.registers.set(Array.isArray(data) ? data : []);
        this.isLoading.set(false);
        if (this.registers().length > 0 && !this.selectedRegisterId()) {
          this.selectedRegisterId.set(this.registers()[0].id);
          this.loadMovements();
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.showToast('Error cargando cajas', 'error');
      },
    });
  }

  loadMovements(): void {
    const id = this.selectedRegisterId();
    if (!id) return;
    this.isLoading.set(true);
    this.financeService.getCashMovements(id, { movementType: this.type }).subscribe({
      next: (data) => {
        this.movements.set(Array.isArray(data) ? data : []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.showToast('Error cargando movimientos', 'error');
      },
    });
  }

  onRegisterChange(): void {
    this.loadMovements();
  }

  submit(): void {
    const id = this.selectedRegisterId();
    if (!id) return;
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
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.showToast(this.isIncome ? 'Ingreso registrado' : 'Egreso registrado', 'success');
        this.resetForm();
        this.loadRegisters();
        this.loadMovements();
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
    this.form = {
      documentType: '',
      movementDate: new Date().toISOString().split('T')[0],
      amount: 0,
      description: '',
      counterpartyName: '',
      concept: '',
    };
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
  editForm = { documentType: '', movementDate: '', amount: 0, counterpartyName: '', concept: '', description: '' };

  openEdit(m: any): void {
    this.editingMovement.set(m);
    this.editForm = {
      documentType: m.documentType || '',
      movementDate: String(m.movementDate || '').substring(0, 10),
      amount: Number(m.amount),
      counterpartyName: m.counterpartyName || '',
      concept: m.concept || '',
      description: m.description || '',
    };
  }

  /** Tipos disponibles al editar: el actual (aunque sea de los anteriores) y los del mismo sentido. */
  editDocumentTypes(): { value: string; label: string }[] {
    const current = this.editForm.documentType;
    const list = this.documentTypes.filter((t) => !CashMovementsComponent.LINKED_TYPES.includes(t.value));
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
