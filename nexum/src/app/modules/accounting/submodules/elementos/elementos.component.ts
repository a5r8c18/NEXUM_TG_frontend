import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AccountingService, JournalEntry, Account, ExpenseType } from '../../../../core/services/accounting.service';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-elementos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: './elementos.component.html',
})
export class ElementosComponent implements OnInit {
  private accountingService = inject(AccountingService);
  private fb = inject(FormBuilder);

  // Signals
  elementos = signal<JournalEntry[]>([]);
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

  // Modal
  showModal = signal(false);
  editingElemento = signal<JournalEntry | null>(null);
  isSaving = signal(false);

  // Forms
  filterForm: FormGroup;
  elementoForm: FormGroup;

  // Computed properties
  filteredElementos = computed(() => {
    let filtered = this.elementos();

    const term = this.searchTerm().toLowerCase();
    if (term) {
      filtered = filtered.filter(el =>
        (el.element || '').toLowerCase().includes(term) ||
        (el.elementDescription || '').toLowerCase().includes(term) ||
        el.accountCode.toLowerCase().includes(term) ||
        el.accountName.toLowerCase().includes(term)
      );
    }

    if (this.accountFilter()) {
      filtered = filtered.filter(el => el.accountCode === this.accountFilter());
    }

    return filtered;
  });

  pagedElementos = computed(() => {
    const filtered = this.filteredElementos();
    const start = (this.currentPage() - 1) * this.pageSize;
    return filtered.slice(start, start + this.pageSize);
  });

  paginationConfig = computed(() => ({
    currentPage: this.currentPage(),
    totalItems: this.filteredElementos().length,
    itemsPerPage: this.pageSize,
    totalPages: Math.ceil(this.filteredElementos().length / this.pageSize),
  }));

  statistics = computed(() => {
    const items = this.elementos();
    return {
      total: items.length,
      posted: items.filter(e => e.status === 'posted').length,
      draft: items.filter(e => e.status === 'draft').length,
      cancelled: items.filter(e => e.status === 'cancelled').length,
    };
  });

  uniqueAccounts = computed(() => {
    const accs = new Map<string, string>();
    this.elementos().forEach(el => {
      if (!accs.has(el.accountCode)) {
        accs.set(el.accountCode, el.accountName);
      }
    });
    return Array.from(accs.entries()).map(([code, name]) => ({ code, name }));
  });

  constructor() {
    this.filterForm = this.fb.group({
      search: [''],
      account: [''],
    });

    this.elementoForm = this.fb.group({
      accountCode: ['', Validators.required],
      subaccountCode: [''],
      entryNumber: ['', Validators.required],
      element: ['', Validators.required],
      elementDescription: [''],
    });

    this.filterForm.valueChanges.subscribe(values => {
      this.searchTerm.set(values.search || '');
      this.accountFilter.set(values.account || '');
      this.currentPage.set(1);
    });

    this.elementoForm.get('accountCode')?.valueChanges.subscribe(accountCode => {
      if (accountCode) {
        this.loadSubaccounts(accountCode);
        this.elementoForm.get('subaccountCode')?.setValue('');
      } else {
        this.subaccounts.set([]);
        this.elementoForm.get('subaccountCode')?.setValue('');
      }
    });
  }

  ngOnInit() {
    this.loadElementos();
    this.loadAccounts();
    this.loadExpenseTypes();
  }

  loadElementos() {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.accountingService.getJournalEntries({}).subscribe({
      next: (data) => {
        this.elementos.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  loadAccounts() {
    this.accountingService.getAccounts({ activeOnly: 'true', allowsMovements: 'true' }).subscribe({
      next: (data) => this.accounts.set(data),
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

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'draft': 'bg-gray-100 text-gray-800',
      'posted': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'draft': 'Borrador',
      'posted': 'Contabilizado',
      'cancelled': 'Anulado',
    };
    return labels[status] || status;
  }

  // Modal actions
  createElemento() {
    this.editingElemento.set(null);
    this.elementoForm.reset({
      accountCode: '',
      subaccountCode: '',
      entryNumber: '',
      element: '',
      elementDescription: '',
    });
    this.subaccounts.set([]);
    this.showModal.set(true);
  }

  editElemento(el: JournalEntry) {
    if (el.status !== 'draft') {
      this.showToast('Solo se pueden editar elementos en borrador', 'error');
      return;
    }
    this.editingElemento.set(el);
    this.elementoForm.patchValue({
      accountCode: el.accountCode,
      subaccountCode: el.subaccountCode || '',
      entryNumber: el.entryNumber,
      element: el.element || '',
      elementDescription: el.elementDescription || '',
    });
    if (el.accountCode) {
      this.loadSubaccounts(el.accountCode);
    }
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingElemento.set(null);
  }

  saveElemento() {
    if (this.elementoForm.invalid) {
      this.showToast('Complete todos los campos requeridos', 'error');
      return;
    }

    const val = this.elementoForm.value;
    const payload = {
      date: new Date().toISOString().split('T')[0],
      description: val.entryNumber,
      accountCode: val.accountCode,
      subaccountCode: val.subaccountCode || undefined,
      entryNumber: val.entryNumber,
      element: val.element,
      elementDescription: val.elementDescription || undefined,
      type: 'manual',
    };

    this.isSaving.set(true);

    if (this.editingElemento()) {
      this.accountingService.updateJournalEntry(this.editingElemento()!.id, payload).subscribe({
        next: () => {
          this.showToast('Elemento actualizado correctamente', 'success');
          this.closeModal();
          this.loadElementos();
          this.isSaving.set(false);
        },
        error: (err) => {
          this.showToast(err.error?.message || 'Error al actualizar elemento', 'error');
          this.isSaving.set(false);
        },
      });
    } else {
      this.accountingService.createJournalEntry(payload).subscribe({
        next: () => {
          this.showToast('Elemento creado correctamente', 'success');
          this.closeModal();
          this.loadElementos();
          this.isSaving.set(false);
        },
        error: (err) => {
          this.showToast(err.error?.message || 'Error al crear elemento', 'error');
          this.isSaving.set(false);
        },
      });
    }
  }

  deleteElemento(el: JournalEntry) {
    if (el.status !== 'draft') {
      this.showToast('Solo se pueden eliminar elementos en borrador', 'error');
      return;
    }
    if (!confirm(`¿Eliminar el elemento "${el.element}"?`)) return;

    this.accountingService.deleteJournalEntry(el.id).subscribe({
      next: () => {
        this.showToast('Elemento eliminado correctamente', 'success');
        this.loadElementos();
      },
      error: (err) => {
        this.showToast(err.error?.message || 'Error al eliminar elemento', 'error');
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

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
    }).format(amount);
  }

  private showToast(message: string, type: 'success' | 'error' | 'info') {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
