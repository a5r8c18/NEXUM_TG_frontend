import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AccountingService, Partida, Account, ExpenseType } from '../../../../core/services/accounting.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-partidas',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: './partidas.component.html',
})
export class PartidasComponent implements OnInit {
  private accountingService = inject(AccountingService);
  private fb = inject(FormBuilder);
  private confirmDialog = inject(ConfirmDialogService);

  // Signals
  partidas = signal<Partida[]>([]);
  accounts = signal<Account[]>([]);
  subaccounts = signal<Account[]>([]);
  expenseTypes = signal<ExpenseType[]>([]);
  isLoading = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  currentPage = signal(1);
  pageSize = 10;
  searchTerm = signal('');
  accountFilter = signal('');
  dateFromFilter = signal('');
  dateToFilter = signal('');

  // Form for filters
  filterForm: FormGroup;
  partidaForm: FormGroup;
  showModal = signal(false);
  editingPartida = signal<Partida | null>(null);
  isSaving = signal(false);

  // Computed properties
  filteredPartidas = computed(() => {
    let filtered = this.partidas();

    // Search filter
    const term = this.searchTerm().toLowerCase();
    if (term) {
      filtered = filtered.filter(partida =>
        (partida.description || '').toLowerCase().includes(term) ||
        partida.accountName.toLowerCase().includes(term) ||
        partida.accountCode.toLowerCase().includes(term)
      );
    }

    // Account filter
    if (this.accountFilter()) {
      filtered = filtered.filter(partida => partida.accountCode === this.accountFilter());
    }

    return filtered;
  });

  pagedPartidas = computed(() => {
    const filtered = this.filteredPartidas();
    const start = (this.currentPage() - 1) * this.pageSize;
    return filtered.slice(start, start + this.pageSize);
  });

  paginationConfig = computed(() => ({
    currentPage: this.currentPage(),
    totalItems: this.filteredPartidas().length,
    itemsPerPage: this.pageSize,
    totalPages: Math.ceil(this.filteredPartidas().length / this.pageSize),
  }));

  // Statistics
  statistics = computed(() => {
    const partidas = this.partidas();
    const totalDebit = partidas.reduce((sum, p) => sum + Number(p.debit), 0);
    const totalCredit = partidas.reduce((sum, p) => sum + Number(p.credit), 0);
    const balance = totalDebit - totalCredit;

    return {
      total: partidas.length,
      totalDebit,
      totalCredit,
      balance,
      isBalanced: Math.abs(balance) < 0.01,
      posted: partidas.filter(p => p.status === 'posted').length,
      draft: partidas.filter(p => p.status === 'draft').length,
      cancelled: partidas.filter(p => p.status === 'cancelled').length
    };
  });

  // Unique accounts for filter
  uniqueAccounts = computed(() => {
    const accounts = new Map<string, string>();
    this.partidas().forEach(partida => {
      if (!accounts.has(partida.accountCode)) {
        accounts.set(partida.accountCode, partida.accountName);
      }
    });
    return Array.from(accounts.entries()).map(([code, name]) => ({ code, name }));
  });

  constructor() {
    this.filterForm = this.fb.group({
      search: [''],
      account: [''],
      dateFrom: [''],
      dateTo: ['']
    });

    this.partidaForm = this.fb.group({
      accountCode: ['', Validators.required],
      subaccountCode: [''],
      entryNumber: ['', Validators.required],
      description: ['']
    });

    // Watch form changes
    this.filterForm.valueChanges.subscribe(values => {
      this.searchTerm.set(values.search || '');
      this.accountFilter.set(values.account || '');
      this.dateFromFilter.set(values.dateFrom || '');
      this.dateToFilter.set(values.dateTo || '');
      this.currentPage.set(1);
    });

    // Watch account changes to load subaccounts
    this.partidaForm.get('accountCode')?.valueChanges.subscribe(accountCode => {
      if (accountCode) {
        this.loadSubaccounts(accountCode);
        this.partidaForm.get('subaccountCode')?.setValue('');
      } else {
        this.subaccounts.set([]);
        this.partidaForm.get('subaccountCode')?.setValue('');
      }
    });
  }

  closeModal() {
    this.showModal.set(false);
    this.editingPartida.set(null);
  }

  savePartida() {
    if (this.partidaForm.invalid) {
      this.showToast('Complete todos los campos requeridos', 'error');
      return;
    }

    const val = this.partidaForm.value;

    const payload = {
      date: new Date().toISOString().split('T')[0],
      description: val.entryNumber,
      accountCode: val.accountCode,
      subaccountCode: val.subaccountCode || undefined,
      entryNumber: val.entryNumber,
      lineDescription: val.description || undefined,
      type: 'manual'
    };

    this.isSaving.set(true);

    if (this.editingPartida()) {
      this.accountingService.updatePartida(this.editingPartida()!.id, payload).subscribe({
        next: () => {
          this.showToast('Partida actualizada correctamente', 'success');
          this.closeModal();
          this.loadPartidas();
          this.isSaving.set(false);
        },
        error: (err) => {
          this.showToast(err.error?.message || 'Error al actualizar partida', 'error');
          this.isSaving.set(false);
        },
      });
    } else {
      this.accountingService.createPartida(payload).subscribe({
        next: () => {
          this.showToast('Partida creada correctamente', 'success');
          this.closeModal();
          this.loadPartidas();
          this.isSaving.set(false);
        },
        error: (err) => {
          this.showToast(err.error?.message || 'Error al crear partida', 'error');
          this.isSaving.set(false);
        },
      });
    }
  }

  postPartida(partida: Partida) {
    if (partida.status !== 'draft') {
      this.showToast('Solo se pueden contabilizar partidas en borrador', 'error');
      return;
    }
    this.accountingService.updatePartidaStatus(partida.id, 'posted').subscribe({
      next: () => {
        this.showToast('Partida contabilizada correctamente', 'success');
        this.loadPartidas();
      },
      error: (err) => {
        this.showToast(err.error?.message || 'Error al contabilizar', 'error');
      },
    });
  }

  async deletePartida(partida: Partida) {
    if (partida.status !== 'draft') {
      this.showToast('Solo se pueden eliminar partidas en borrador', 'error');
      return;
    }
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar partida',
      message: `¿Eliminar la partida "${partida.entryNumber}"?`,
      confirmText: 'Eliminar',
      type: 'danger'
    });
    if (!confirmed) return;

    this.accountingService.deletePartida(partida.id).subscribe({
      next: () => {
        this.showToast('Partida eliminada correctamente', 'success');
        this.loadPartidas();
      },
      error: (err) => {
        this.showToast(err.error?.message || 'Error al eliminar partida', 'error');
      },
    });
  }

  async cancelPartida(partida: Partida) {
    if (partida.status !== 'draft') {
      this.showToast('Solo se pueden anular partidas en borrador', 'error');
      return;
    }
    const confirmed = await this.confirmDialog.confirm({
      title: 'Anular partida',
      message: `¿Anular la partida "${partida.entryNumber}"?`,
      confirmText: 'Anular',
      type: 'warning'
    });
    if (!confirmed) return;

    this.accountingService.updatePartidaStatus(partida.id, 'cancelled').subscribe({
      next: () => {
        this.showToast('Partida anulada correctamente', 'success');
        this.loadPartidas();
      },
      error: (err) => {
        this.showToast(err.error?.message || 'Error al anular', 'error');
      },
    });
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'manual': 'Manual',
      'adjustment': 'Ajuste',
      'opening': 'Apertura',
      'closing': 'Cierre',
      'correction': 'Corrección'
    };
    return labels[type] || type;
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

  ngOnInit() {
    this.loadPartidas();
    this.loadAccounts();
    this.loadExpenseTypes();
  }

  loadAccounts() {
    this.accountingService.getAccounts({ activeOnly: 'true', allowsMovements: 'true' }).subscribe({
      next: (data) => {
        // Filtrar solo cuentas de nivel 3 (Cuentas) y tipo expense (gastos)
        const accountsOnly = data.filter(acc => acc.level === 3 && acc.type === 'expense');
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

  getExpenseTypeName(code: string): string {
    const expType = this.expenseTypes().find(et => et.code === code);
    return expType?.name || '';
  }

  loadPartidas() {
    this.isLoading.set(true);
    this.hasError.set(false);

    const filters: any = {};
    if (this.dateFromFilter()) filters.fromDate = this.dateFromFilter();
    if (this.dateToFilter()) filters.toDate = this.dateToFilter();
    if (this.accountFilter()) filters.accountCode = this.accountFilter();

    this.accountingService.getPartidas(filters).subscribe({
      next: (data) => {
        this.partidas.set(data);
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

  createPartida() {
    this.editingPartida.set(null);
    this.partidaForm.reset({
      accountCode: '',
      subaccountCode: '',
      entryNumber: '',
      description: ''
    });
    this.subaccounts.set([]);
    this.showModal.set(true);
  }

  editPartida(partida: Partida) {
    if (partida.status !== 'draft') {
      this.showToast('Solo se pueden editar partidas en borrador', 'error');
      return;
    }
    this.editingPartida.set(partida);
    this.partidaForm.patchValue({
      accountCode: partida.accountCode,
      subaccountCode: partida.subaccountCode || '',
      entryNumber: partida.entryNumber,
      description: partida.lineDescription || ''
    });
    
    // Load subaccounts if account has them
    if (partida.accountCode) {
      this.loadSubaccounts(partida.accountCode);
    }
    this.showModal.set(true);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES');
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(amount);
  }

  // Helper methods for template
  abs(value: number): number {
    return Math.abs(value);
  }

  private showToast(message: string, type: 'success' | 'error' | 'info') {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
