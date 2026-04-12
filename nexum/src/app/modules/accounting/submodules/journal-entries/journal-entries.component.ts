import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AccountingService, Voucher, Account, ExpenseType, CostCenter, JournalEntry } from '../../../../core/services/accounting.service';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-journal-entries',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: './journal-entries.component.html',
})
export class JournalEntriesComponent implements OnInit {
  private accountingService = inject(AccountingService);
  private fb = inject(FormBuilder);

  // Signals
  comprobantes = signal<Voucher[]>([]);
  isLoading = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  currentPage = signal(1);
  pageSize = 10;
  searchTerm = signal('');
  typeFilter = signal('');
  dateFromFilter = signal('');
  dateToFilter = signal('');
  statusFilter = signal('');
  selectedComprobante = signal<Voucher | null>(null);
  showEntriesDetail = signal(false);
  showModal = signal(false);
  editingVoucher = signal<Voucher | null>(null);
  isSaving = signal(false);
  accounts = signal<Account[]>([]);
  subaccounts = signal<Account[]>([]);
  expenseTypes = signal<ExpenseType[]>([]);
  costCenters = signal<CostCenter[]>([]);
  elementos = signal<JournalEntry[]>([]);

  // Forms
  filterForm: FormGroup;
  voucherForm: FormGroup;

  // Computed properties
  filteredComprobantes = computed(() => {
    let filtered = this.comprobantes();

    // Search filter
    const term = this.searchTerm().toLowerCase();
    if (term) {
      filtered = filtered.filter(comp =>
        comp.description.toLowerCase().includes(term) ||
        comp.voucherNumber.toLowerCase().includes(term) ||
        comp.reference?.toLowerCase().includes(term)
      );
    }

    // Type filter
    if (this.typeFilter()) {
      filtered = filtered.filter(comp => comp.type === this.typeFilter());
    }

    // Status filter
    if (this.statusFilter()) {
      filtered = filtered.filter(comp => comp.status === this.statusFilter());
    }

    // Date filters
    if (this.dateFromFilter()) {
      filtered = filtered.filter(comp => comp.date >= this.dateFromFilter());
    }
    if (this.dateToFilter()) {
      filtered = filtered.filter(comp => comp.date <= this.dateToFilter());
    }

    return filtered;
  });

  pagedComprobantes = computed(() => {
    const filtered = this.filteredComprobantes();
    const start = (this.currentPage() - 1) * this.pageSize;
    return filtered.slice(start, start + this.pageSize);
  });

  paginationConfig = computed(() => ({
    currentPage: this.currentPage(),
    totalItems: this.filteredComprobantes().length,
    itemsPerPage: this.pageSize,
    totalPages: Math.ceil(this.filteredComprobantes().length / this.pageSize),
  }));

  // Statistics
  statistics = computed(() => {
    const comps = this.comprobantes();
    const totalAmount = comps.reduce((sum, comp) => sum + Number(comp.totalAmount), 0);

    return {
      total: comps.length,
      totalAmount,
      posted: comps.filter(c => c.status === 'posted').length,
      draft: comps.filter(c => c.status === 'draft').length,
      cancelled: comps.filter(c => c.status === 'cancelled').length
    };
  });

  // No longer using line-based totals; single debit/credit fields in form

  constructor() {
    this.filterForm = this.fb.group({
      search: [''],
      type: [''],
      status: [''],
      dateFrom: [''],
      dateTo: ['']
    });

    this.voucherForm = this.fb.group({
      date: [new Date().toISOString().split('T')[0], Validators.required],
      primaryDocument: ['', Validators.required],
      accountCode: ['', Validators.required],
      subaccountCode: [''],
      entryNumber: ['', Validators.required],
      element: [''],
      costCenterId: [''],
      debit: [0, [Validators.required, Validators.min(0)]],
      credit: [0, [Validators.required, Validators.min(0)]],
    });

    // Watch accountCode changes to load subaccounts
    this.voucherForm.get('accountCode')?.valueChanges.subscribe(code => {
      if (code) {
        this.loadSubaccounts(code);
        this.voucherForm.get('subaccountCode')?.setValue('');
      } else {
        this.subaccounts.set([]);
        this.voucherForm.get('subaccountCode')?.setValue('');
      }
    });

    // Watch form changes
    this.filterForm.valueChanges.subscribe(values => {
      this.searchTerm.set(values.search || '');
      this.typeFilter.set(values.type || '');
      this.statusFilter.set(values.status || '');
      this.dateFromFilter.set(values.dateFrom || '');
      this.dateToFilter.set(values.dateTo || '');
      this.currentPage.set(1);
    });
  }

  ngOnInit() {
    this.loadComprobantes();
    this.loadAccounts();
    this.loadExpenseTypes();
    this.loadCostCenters();
    this.loadElementos();
  }

  loadAccounts() {
    this.accountingService.getAccounts({ activeOnly: 'true', allowsMovements: 'true' }).subscribe({
      next: (data) => {
        // Filtrar solo cuentas de nivel 3 (Cuentas), excluir subcuentas (level 4+)
        const accountsOnly = data.filter(acc => acc.level === 3);
        this.accounts.set(accountsOnly);
      },
      error: () => {},
    });
  }

  loadSubaccounts(parentCode: string) {
    this.accountingService.getAccountsByParentCode(parentCode).subscribe({
      next: (data) => this.subaccounts.set(data),
      error: () => this.subaccounts.set([]),
    });
  }

  loadExpenseTypes() {
    this.accountingService.getExpenseTypes().subscribe({
      next: (data) => this.expenseTypes.set(data),
      error: () => {},
    });
  }

  loadCostCenters() {
    this.accountingService.getCostCenters({ activeOnly: 'true' }).subscribe({
      next: (data) => this.costCenters.set(data),
      error: () => {},
    });
  }

  loadElementos() {
    this.accountingService.getJournalEntries({}).subscribe({
      next: (data) => this.elementos.set(data.filter(e => !!e.element)),
      error: () => {},
    });
  }

  uniqueElementos = computed(() => {
    const seen = new Set<string>();
    return this.elementos().filter(e => {
      if (seen.has(e.element!)) return false;
      seen.add(e.element!);
      return true;
    });
  });

  loadComprobantes() {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.accountingService.getVouchers().subscribe({
      next: (data) => {
        this.comprobantes.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  resetFilters() {
    this.filterForm.reset();
    this.currentPage.set(1);
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'factura': 'Factura',
      'recibo': 'Recibo',
      'nota_debito': 'Nota Débito',
      'nota_credito': 'Nota Crédito',
      'nomina': 'Nómina',
      'depreciacion': 'Depreciación',
      'ajuste': 'Ajuste',
      'apertura': 'Apertura',
      'cierre': 'Cierre',
      'otro': 'Otro'
    };
    return labels[type] || type;
  }

  getSourceLabel(source: string): string {
    const labels: Record<string, string> = {
      'manual': 'Manual',
      'inventory': 'Inventario',
      'invoices': 'Facturación',
      'fixed-assets': 'Activos Fijos',
      'hr': 'Nómina'
    };
    return labels[source] || source;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'draft': 'bg-gray-100 text-gray-800',
      'posted': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'draft': 'Borrador',
      'posted': 'Contabilizado',
      'cancelled': 'Anulado'
    };
    return labels[status] || status;
  }

  createComprobante() {
    this.editingVoucher.set(null);
    this.voucherForm.reset({
      date: new Date().toISOString().split('T')[0],
      primaryDocument: '',
      accountCode: '',
      subaccountCode: '',
      entryNumber: '',
      element: '',
      costCenterId: '',
      debit: 0,
      credit: 0,
    });
    this.subaccounts.set([]);
    this.showModal.set(true);
  }

  editComprobante(comprobante: Voucher) {
    if (comprobante.status !== 'draft') {
      this.showToast('Solo se pueden editar comprobantes en borrador', 'error');
      return;
    }
    this.editingVoucher.set(comprobante);
    // For edit, populate from first line if available
    const firstLine = comprobante.lines?.[0];
    this.voucherForm.patchValue({
      date: comprobante.date,
      primaryDocument: comprobante.reference || '',
      accountCode: firstLine?.accountCode || '',
      subaccountCode: '',
      entryNumber: '',
      element: '',
      costCenterId: firstLine?.costCenterId || '',
      debit: firstLine ? Number(firstLine.debit) : 0,
      credit: firstLine ? Number(firstLine.credit) : 0,
    });
    if (firstLine?.accountCode) {
      this.loadSubaccounts(firstLine.accountCode);
    }
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingVoucher.set(null);
  }

  getExpenseTypeName(code: string): string {
    const et = this.expenseTypes().find(e => e.code === code);
    return et?.name || '';
  }

  saveVoucher() {
    if (this.voucherForm.invalid) {
      this.showToast('Complete todos los campos requeridos', 'error');
      return;
    }

    const val = this.voucherForm.value;
    const debit = Number(val.debit) || 0;
    const credit = Number(val.credit) || 0;

    if (debit === 0 && credit === 0) {
      this.showToast('Debe ingresar un monto en Debe o Haber', 'error');
      return;
    }

    const payload = {
      date: val.date,
      type: 'otro' as const,
      description: val.primaryDocument,
      reference: val.primaryDocument || undefined,
      sourceModule: 'manual',
      lines: [
        {
          accountCode: val.accountCode,
          debit,
          credit,
          description: val.element || val.primaryDocument || undefined,
          costCenterId: val.costCenterId || undefined,
          lineOrder: 1,
        },
      ],
    };

    this.isSaving.set(true);
    this.accountingService.createVoucher(payload).subscribe({
      next: () => {
        this.showToast('Comprobante creado correctamente', 'success');
        this.closeModal();
        this.loadComprobantes();
        this.isSaving.set(false);
      },
      error: (err) => {
        this.showToast(err.error?.message || 'Error al guardar comprobante', 'error');
        this.isSaving.set(false);
      },
    });
  }

  deleteComprobante(comprobante: Voucher) {
    if (!confirm(`¿Eliminar el comprobante ${comprobante.voucherNumber}?`)) return;

    this.accountingService.deleteVoucher(comprobante.id).subscribe({
      next: () => {
        this.showToast('Comprobante eliminado correctamente', 'success');
        this.loadComprobantes();
      },
      error: (err) => {
        this.showToast(err.error?.message || 'Error al eliminar comprobante', 'error');
      },
    });
  }

  postComprobante(comprobante: Voucher) {
    this.accountingService.updateVoucherStatus(comprobante.id, 'posted').subscribe({
      next: () => {
        this.showToast('Comprobante contabilizado correctamente', 'success');
        this.loadComprobantes();
      },
      error: (err) => {
        this.showToast(err.error?.message || 'Error al contabilizar', 'error');
      },
    });
  }

  cancelComprobante(comprobante: Voucher) {
    if (!confirm(`¿Anular el comprobante ${comprobante.voucherNumber}?`)) return;

    this.accountingService.updateVoucherStatus(comprobante.id, 'cancelled').subscribe({
      next: () => {
        this.showToast('Comprobante anulado correctamente', 'success');
        this.loadComprobantes();
      },
      error: (err) => {
        this.showToast(err.error?.message || 'Error al anular', 'error');
      },
    });
  }

  viewEntries(comprobante: Voucher) {
    this.selectedComprobante.set(comprobante);
    this.showEntriesDetail.set(true);
  }

  closeEntriesDetail() {
    this.showEntriesDetail.set(false);
    this.selectedComprobante.set(null);
  }

  private showToast(message: string, type: 'success' | 'error' | 'info') {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
