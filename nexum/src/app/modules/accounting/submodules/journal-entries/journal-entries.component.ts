import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { AccountingService, Voucher, Account, ExpenseType, CostCenter } from '../../../../core/services/accounting.service';
import { SubelementsService, Subelement } from '../../../../core/services/subelements.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-journal-entries',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: './journal-entries.component.html',
})
export class JournalEntriesComponent implements OnInit {
  private accountingService = inject(AccountingService);
  private subelementsService = inject(SubelementsService);
  private fb = inject(FormBuilder);
  private confirmDialog = inject(ConfirmDialogService);

  // Signals
  comprobantes = signal<Voucher[]>([]);
  isLoading = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  currentPage = signal(1);
  pageSize = 10;
  searchTerm = signal('');
  accountCodeFilter = signal('');
  subaccountCodeFilter = signal('');
  dateFromFilter = signal('');
  dateToFilter = signal('');
  statusFilter = signal('');

  // Searchable dropdown data
  accounts = signal<Account[]>([]);
  subaccounts = signal<Account[]>([]);
  costCenters = signal<CostCenter[]>([]);
  expenseTypes = signal<ExpenseType[]>([]);
  subelements = signal<Subelement[]>([]);
  
  // Filtered data for each line
  filteredAccounts = signal<Map<number, Account[]>>(new Map());
  filteredSubaccounts = signal<Map<number, Account[]>>(new Map());
  filteredCostCenters = signal<Map<number, CostCenter[]>>(new Map());
  filteredElements = signal<Map<number, any[]>>(new Map());
  selectedComprobante = signal<Voucher | null>(null);
  showEntriesDetail = signal(false);
  showModal = signal(false);
  editingVoucher = signal<Voucher | null>(null);
  isSaving = signal(false);
  
  // Forms
  filterForm: FormGroup;
  voucherForm: FormGroup;
  linesFormArray: FormArray;

  // Computed properties
  filteredComprobantes = computed(() => {
    let filtered = this.comprobantes();

    // Voucher number filter (search field is now specifically for voucher number)
    const voucherNumber = this.searchTerm().toLowerCase();
    if (voucherNumber) {
      filtered = filtered.filter(comp =>
        comp.voucherNumber.toLowerCase().includes(voucherNumber)
      );
    }

    // Account filter
    if (this.accountCodeFilter()) {
      filtered = filtered.filter(comp =>
        comp.lines?.some(line => line.accountCode.toLowerCase().includes(this.accountCodeFilter().toLowerCase()))
      );
    }

    // Subaccount filter
    if (this.subaccountCodeFilter()) {
      filtered = filtered.filter(comp =>
        comp.lines?.some(line => 
          line.subaccountCode && line.subaccountCode.toLowerCase().includes(this.subaccountCodeFilter().toLowerCase())
        )
      );
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
      accountCode: [''],
      subaccountCode: [''],
      status: [''],
      dateFrom: [''],
      dateTo: ['']
    });

    // Establecer fecha actual en formato YYYY-MM-DD para input type date
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const currentDate = `${year}-${month}-${day}`;

    console.log('=== DEBUG FECHA ===');
    console.log('Fecha actual (YYYY-MM-DD):', currentDate);

    this.voucherForm = this.fb.group({
      date: [currentDate, Validators.required],
      description: [''],
      type: ['otro'],
      lines: this.fb.array([])
    });

    console.log('Valor en formulario:', this.voucherForm.get('date')?.value);
    console.log('==================');
    
    this.linesFormArray = this.voucherForm.get('lines') as FormArray;
    
    // Initialize with one empty line
    this.addLine();

    // Watch form changes for filters
    this.filterForm.valueChanges.subscribe(values => {
      this.searchTerm.set(values.search || '');
      this.accountCodeFilter.set(values.accountCode || '');
      this.subaccountCodeFilter.set(values.subaccountCode || '');
      this.statusFilter.set(values.status || '');
      this.dateFromFilter.set(values.dateFrom || '');
      this.dateToFilter.set(values.dateTo || '');
      this.currentPage.set(1);
      // Reload vouchers with new filters
      this.loadComprobantes();
    });
  }

  // Helper methods for form array
  createLineFormGroup(): FormGroup {
    return this.fb.group({
      accountCode: ['', Validators.required],
      subaccountCode: [''],
      element: [''],
      costCenterId: [''],
      debit: [0, [Validators.required, Validators.min(0)]],
      credit: [0, [Validators.required, Validators.min(0)]]
    });
  }

  addLine() {
    const newLine = this.createLineFormGroup();
    
    // Watch accountCode changes to load subaccounts for this line
    newLine.get('accountCode')?.valueChanges.subscribe(code => {
      if (code) {
        this.loadSubaccounts(code);
      }
    });
    
    this.linesFormArray.push(newLine);
  }

  removeLine(index: number) {
    if (this.linesFormArray.length > 1) {
      this.linesFormArray.removeAt(index);
    }
  }

  getLineControls() {
    return this.linesFormArray.controls as FormGroup[];
  }

  ngOnInit() {
    this.loadComprobantes();
    this.loadAccounts();
    this.loadExpenseTypes();
    this.loadCostCenters();
    this.loadSubelements();
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

  loadSubelements() {
    this.subelementsService.findAll({ activeOnly: true }).subscribe({
      next: (data) => this.subelements.set(data),
      error: () => this.subelements.set([]),
    });
  }
  
  loadComprobantes() {
    this.isLoading.set(true);
    this.hasError.set(false);

    const filters = this.filterForm.value;
    this.accountingService.getVouchers(filters).subscribe({
      next: (data) => {
        this.comprobantes.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading vouchers:', err);
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
    
    // Usar la misma lógica de fecha local que en el constructor (YYYY-MM-DD)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const currentDate = `${year}-${month}-${day}`;
    
    this.voucherForm.reset({
      date: currentDate,
      description: '',
      type: 'otro'
    });
    
    // Clear lines and add one empty line
    this.linesFormArray.clear();
    this.addLine();
    this.subaccounts.set([]);
    this.showModal.set(true);
  }

  editComprobante(comprobante: Voucher) {
    if (comprobante.status !== 'draft') {
      this.showToast('Solo se pueden editar comprobantes en borrador', 'error');
      return;
    }
    this.editingVoucher.set(comprobante);
    
    // Populate header fields
    this.voucherForm.patchValue({
      date: comprobante.date,
      description: comprobante.description || '',
      type: comprobante.type || 'otro'
    });
    
    // Clear existing lines and populate with voucher lines
    this.linesFormArray.clear();
    
    if (comprobante.lines && comprobante.lines.length > 0) {
      comprobante.lines.forEach(line => {
        const lineGroup = this.createLineFormGroup();
        lineGroup.patchValue({
          accountCode: line.accountCode || '',
          subaccountCode: '',
          entryNumber: '',
          element: '',
          costCenterId: line.costCenterId || '',
          debit: Number(line.debit) || 0,
          credit: Number(line.credit) || 0
        });
        
        // Watch accountCode changes for this line
        lineGroup.get('accountCode')?.valueChanges.subscribe(code => {
          if (code) {
            this.loadSubaccounts(code);
          }
        });
        
        this.linesFormArray.push(lineGroup);
      });
    } else {
      // Add one empty line if no existing lines
      this.addLine();
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
    if (this.voucherForm.invalid || this.linesFormArray.invalid) {
      this.showToast('Complete todos los campos requeridos', 'error');
      return;
    }

    const headerValues = this.voucherForm.value;
    const lines = this.linesFormArray.value;

    // Validate that at least one line has debit or credit
    const hasValidLines = lines.some((line: any) => 
      (Number(line.debit) > 0) || (Number(line.credit) > 0)
    );

    if (!hasValidLines) {
      this.showToast('Al menos una línea debe tener un monto en Debe o Haber', 'error');
      return;
    }

    // Calculate totals
    const totalDebit = lines.reduce((sum: number, line: any) => sum + (Number(line.debit) || 0), 0);
    const totalCredit = lines.reduce((sum: number, line: any) => sum + (Number(line.credit) || 0), 0);

    // Validate that debits equal credits
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      this.showToast('El total del Debe debe ser igual al total del Haber', 'error');
      return;
    }

    const payload = {
      date: headerValues.date,
      description: headerValues.description || 'Comprobante manual',
      sourceModule: 'manual',
      lines: lines.map((line: any, index: number) => ({
        accountCode: line.accountCode,
        subaccountCode: line.subaccountCode || null,
        element: line.element || null,
        costCenterId: line.costCenterId || null,
        debit: Number(line.debit) || 0,
        credit: Number(line.credit) || 0,
        lineOrder: index + 1,
      })),
    };

    // Logs para depuración
    console.log('=== CREANDO COMPROBANTE ===');
    console.log('Header Values:', headerValues);
    console.log('Lines detalladas:', lines.map((line: any, index: number) => ({
      index,
      accountCode: line.accountCode,
      subaccountCode: line.subaccountCode,
      element: line.element,
      costCenterId: line.costCenterId,
      debit: line.debit,
      credit: line.credit
    })));
    console.log('Payload enviado al backend:', JSON.stringify(payload, null, 2));
    console.log('==========================');

    this.isSaving.set(true);
    
    // For now, both create and edit use createVoucher
    // TODO: Implement proper update functionality when backend supports it
    this.accountingService.createVoucher(payload).subscribe({
      next: () => {
        const message = this.editingVoucher() ? 'Comprobante actualizado correctamente' : 'Comprobante creado correctamente';
        this.showToast(message, 'success');
        this.closeModal();
        this.loadComprobantes();
        this.isSaving.set(false);
      },
      error: (err) => {
        const errorMessage = this.editingVoucher() ? 'Error al actualizar comprobante' : 'Error al guardar comprobante';
        this.showToast(err.error?.message || errorMessage, 'error');
        this.isSaving.set(false);
      },
    });
  }

  async deleteComprobante(comprobante: Voucher) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar comprobante',
      message: `¿Eliminar el comprobante ${comprobante.voucherNumber}?`,
      confirmText: 'Eliminar',
      type: 'danger'
    });
    if (!confirmed) return;

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

  async cancelComprobante(comprobante: Voucher) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Anular comprobante',
      message: `¿Anular el comprobante ${comprobante.voucherNumber}?`,
      confirmText: 'Anular',
      type: 'warning'
    });
    if (!confirmed) return;

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
    // Logs para depuración del modal de detalles
    console.log('=== MODAL DETALLES COMPROBANTE ===');
    console.log('Comprobante seleccionado:', JSON.stringify(comprobante, null, 2));
    console.log('Líneas del comprobante:', comprobante.lines);
    console.log('================================');
    
    this.selectedComprobante.set(comprobante);
    this.showEntriesDetail.set(true);
  }

  closeEntriesDetail() {
    this.showEntriesDetail.set(false);
    this.selectedComprobante.set(null);
  }

  // Computed totals for validation display
  totalDebit = computed(() => {
    return this.linesFormArray.value.reduce((sum: number, line: any) => 
      sum + (Number(line.debit) || 0), 0
    );
  });

  totalCredit = computed(() => {
    return this.linesFormArray.value.reduce((sum: number, line: any) => 
      sum + (Number(line.credit) || 0), 0
    );
  });

  isBalanced = computed(() => {
    return Math.abs(this.totalDebit() - this.totalCredit()) < 0.01;
  });

  private showToast(message: string, type: 'success' | 'error' | 'info') {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3000);
  }

  // Searchable dropdown methods
  filterAccounts(searchTerm: string, lineIndex: number) {
    const filtered = this.accounts().filter(account =>
      account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const currentMap = this.filteredAccounts();
    currentMap.set(lineIndex, filtered);
    this.filteredAccounts.set(new Map(currentMap));
  }

  filterSubaccounts(searchTerm: string, lineIndex: number) {
    const filtered = this.subaccounts().filter(subaccount =>
      subaccount.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subaccount.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const currentMap = this.filteredSubaccounts();
    currentMap.set(lineIndex, filtered);
    this.filteredSubaccounts.set(new Map(currentMap));
  }

  filterCostCenters(searchTerm: string, lineIndex: number) {
    const filtered = this.costCenters().filter(costCenter =>
      costCenter.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      costCenter.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const currentMap = this.filteredCostCenters();
    currentMap.set(lineIndex, filtered);
    this.filteredCostCenters.set(new Map(currentMap));
  }

  filterElements(searchTerm: string, lineIndex: number) {
    const filtered = this.subelements().filter(subelement =>
      subelement.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subelement.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const currentMap = this.filteredElements();
    currentMap.set(lineIndex, filtered);
    this.filteredElements.set(new Map(currentMap));
  }

  getFilteredAccounts(lineIndex: number) {
    return this.filteredAccounts().get(lineIndex) || [];
  }

  getFilteredSubaccounts(lineIndex: number) {
    return this.filteredSubaccounts().get(lineIndex) || [];
  }

  getFilteredCostCenters(lineIndex: number) {
    return this.filteredCostCenters().get(lineIndex) || [];
  }

  getFilteredElements(lineIndex: number) {
    return this.filteredElements().get(lineIndex) || [];
  }

  selectAccount(account: Account, lineIndex: number) {
    const lineGroup = this.getLineControls()[lineIndex];
    lineGroup.get('accountCode')?.setValue(account.code);
    
    // Clear filtered accounts for this line
    const currentMap = this.filteredAccounts();
    currentMap.delete(lineIndex);
    this.filteredAccounts.set(new Map(currentMap));
    
    // Load subaccounts for this account
    this.loadSubaccounts(account.code);
  }

  selectSubaccount(subaccount: Account, lineIndex: number) {
    const lineGroup = this.getLineControls()[lineIndex];
    lineGroup.get('subaccountCode')?.setValue(subaccount.code);
    
    // Clear filtered subaccounts for this line
    const currentMap = this.filteredSubaccounts();
    currentMap.delete(lineIndex);
    this.filteredSubaccounts.set(new Map(currentMap));
  }

  selectCostCenter(costCenter: CostCenter, lineIndex: number) {
    const lineGroup = this.getLineControls()[lineIndex];
    lineGroup.get('costCenterId')?.setValue(costCenter.id);
    
    // Clear filtered cost centers for this line
    const currentMap = this.filteredCostCenters();
    currentMap.delete(lineIndex);
    this.filteredCostCenters.set(new Map(currentMap));
  }

  selectElement(subelement: Subelement, lineIndex: number) {
    const lineGroup = this.getLineControls()[lineIndex];
    lineGroup.get('element')?.setValue(subelement.code);
    
    // Clear filtered elements for this line
    const currentMap = this.filteredElements();
    currentMap.set(lineIndex, []);
    this.filteredElements.set(new Map(currentMap));
  }

  getAccountDisplay(accountCode: string): string {
    if (!accountCode) return '';
    const account = this.accounts().find(acc => acc.code === accountCode);
    return account ? `${account.code} - ${account.name}` : accountCode;
  }

  getSubaccountDisplay(subaccountCode: string): string {
    if (!subaccountCode) return '';
    const subaccount = this.subaccounts().find(sub => sub.code === subaccountCode);
    return subaccount ? `${subaccount.code} - ${subaccount.name}` : subaccountCode;
  }

  getCostCenterDisplay(costCenterId: string): string {
    if (!costCenterId) return '';
    const costCenter = this.costCenters().find(cc => cc.id === costCenterId);
    return costCenter ? `${costCenter.code} - ${costCenter.name}` : costCenterId;
  }

  getElementDisplay(elementCode: string): string {
    if (!elementCode) return '';
    const subelement = this.subelements().find(el => el.code === elementCode);
    return subelement ? `${subelement.code} - ${subelement.name}` : elementCode;
  }

  // Methods to handle debit/credit field interactions
  onDebitChange(event: any, lineIndex: number) {
    const lineGroup = this.getLineControls()[lineIndex];
    const debitValue = event.target.value;
    const creditControl = lineGroup.get('credit');
    
    if (debitValue && Number(debitValue) > 0) {
      creditControl?.setValue(0);
      creditControl?.disable();
    } else {
      creditControl?.enable();
    }
  }

  onCreditChange(event: any, lineIndex: number) {
    const lineGroup = this.getLineControls()[lineIndex];
    const creditValue = event.target.value;
    const debitControl = lineGroup.get('debit');
    
    if (creditValue && Number(creditValue) > 0) {
      debitControl?.setValue(0);
      debitControl?.disable();
    } else {
      debitControl?.enable();
    }
  }
}
