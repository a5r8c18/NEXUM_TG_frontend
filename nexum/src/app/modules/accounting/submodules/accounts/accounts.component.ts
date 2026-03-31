import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AccountingService, Account, AccountFilters, AccountStatistics } from '../../../../core/services/accounting.service';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: './accounts.component.html',
})
export class AccountsComponent implements OnInit {
  private accountingService = inject(AccountingService);
  private fb = inject(FormBuilder);

  accounts = signal<Account[]>([]);
  statistics = signal<AccountStatistics | null>(null);
  isLoading = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Filters
  searchTerm = signal('');
  typeFilter = signal('');
  natureFilter = signal('');
  levelFilter = signal('');
  activeOnly = signal(false);

  // View mode
  viewMode = signal<'table' | 'tree'>('table');

  // Pagination
  currentPage = signal(1);
  pageSize = 20;

  // Modals
  showCreateModal = signal(false);
  showEditModal = signal(false);
  selectedAccount = signal<Account | null>(null);

  // Tree expansion state
  expandedNodes = signal<Set<string>>(new Set());

  accountForm: FormGroup;

  // Cuban accounting group labels
  groupLabels: Record<string, string> = {
    '1': 'Activos',
    '2': 'Pasivos',
    '3': 'Patrimonio',
    '4': 'Ingresos',
    '5': 'Costos',
    '6': 'Gastos',
    '7': 'Resultados',
    '8': 'Cuentas de Memorándum',
    '9': 'Cuentas de Control',
  };

  typeLabels: Record<string, string> = {
    asset: 'Activo',
    liability: 'Pasivo',
    equity: 'Patrimonio',
    income: 'Ingreso',
    expense: 'Gasto',
  };

  natureLabels: Record<string, string> = {
    deudora: 'Deudora',
    acreedora: 'Acreedora',
  };

  filteredAccounts = computed(() => {
    let filtered = this.accounts();
    const term = this.searchTerm().toLowerCase();
    if (term) {
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(term) ||
          a.code.toLowerCase().includes(term) ||
          (a.description && a.description.toLowerCase().includes(term))
      );
    }
    if (this.typeFilter()) {
      filtered = filtered.filter((a) => a.type === this.typeFilter());
    }
    if (this.natureFilter()) {
      filtered = filtered.filter((a) => a.nature === this.natureFilter());
    }
    if (this.levelFilter()) {
      filtered = filtered.filter((a) => a.level === parseInt(this.levelFilter()));
    }
    if (this.activeOnly()) {
      filtered = filtered.filter((a) => a.isActive);
    }
    return filtered;
  });

  pagedAccounts = computed(() => {
    const filtered = this.filteredAccounts();
    const start = (this.currentPage() - 1) * this.pageSize;
    return filtered.slice(start, start + this.pageSize);
  });

  treeAccounts = computed(() => {
    const filtered = this.filteredAccounts();
    // Build tree: group by level 1 parent
    const roots = filtered.filter((a) => a.level === 1);
    return roots.map((root) => ({
      ...root,
      children: this.getChildren(root.code, filtered),
    }));
  });

  paginationConfig = computed(() => ({
    currentPage: this.currentPage(),
    totalItems: this.filteredAccounts().length,
    itemsPerPage: this.pageSize,
    totalPages: Math.ceil(this.filteredAccounts().length / this.pageSize),
  }));

  // Distinct levels present in accounts
  availableLevels = computed(() => {
    const levels = [...new Set(this.accounts().map((a) => a.level))];
    return levels.sort((a, b) => a - b);
  });

  constructor() {
    this.accountForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{1,10}$/)]],
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      type: ['asset', Validators.required],
      nature: ['deudora', Validators.required],
      level: [1, [Validators.required, Validators.min(1), Validators.max(9)]],
      groupNumber: [''],
      parentCode: [''],
      isActive: [true],
      allowsMovements: [false],
    });
  }

  ngOnInit() {
    this.loadAccounts();
    this.loadStatistics();
  }

  loadAccounts() {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.accountingService.getAccounts().subscribe({
      next: (data) => {
        this.accounts.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  loadStatistics() {
    this.accountingService.getAccountStatistics().subscribe({
      next: (stats) => this.statistics.set(stats),
      error: () => {},
    });
  }

  getChildren(parentCode: string, allAccounts: Account[]): any[] {
    const children = allAccounts.filter((a) => a.parentCode === parentCode);
    return children.map((child) => ({
      ...child,
      children: this.getChildren(child.code, allAccounts),
    }));
  }

  toggleExpansion(nodeCode: string, event: Event) {
    event.stopPropagation();
    const expanded = new Set(this.expandedNodes());
    if (expanded.has(nodeCode)) {
      expanded.delete(nodeCode);
    } else {
      expanded.add(nodeCode);
    }
    this.expandedNodes.set(expanded);
  }

  isExpanded(nodeCode: string): boolean {
    return this.expandedNodes().has(nodeCode);
  }

  hasChildren(account: any): boolean {
    return account.children && account.children.length > 0;
  }

  
  // Expand all nodes
  expandAll() {
    const allCodes = this.accounts().map(a => a.code);
    this.expandedNodes.set(new Set(allCodes));
  }

  // Collapse all nodes
  collapseAll() {
    this.expandedNodes.set(new Set());
  }

  // Actions
  openCreateModal() {
    this.accountForm.reset({
      code: '',
      name: '',
      description: '',
      type: 'asset',
      nature: 'deudora',
      level: 1,
      groupNumber: '',
      parentCode: '',
      isActive: true,
      allowsMovements: false,
    });
    this.showCreateModal.set(true);
  }

  openEditModal(account: Account) {
    this.selectedAccount.set(account);
    this.accountForm.patchValue({
      code: account.code,
      name: account.name,
      description: account.description || '',
      type: account.type,
      nature: account.nature,
      level: account.level,
      groupNumber: account.groupNumber || '',
      parentCode: account.parentCode || '',
      isActive: account.isActive,
      allowsMovements: account.allowsMovements,
    });
    this.showEditModal.set(true);
  }

  closeModals() {
    this.showCreateModal.set(false);
    this.showEditModal.set(false);
    this.selectedAccount.set(null);
    this.accountForm.reset();
  }

  createAccount() {
    if (this.accountForm.invalid) {
      this.accountForm.markAllAsTouched();
      return;
    }
    const data = this.accountForm.value;
    // Auto-detect groupNumber from first digit of code
    if (!data.groupNumber && data.code) {
      data.groupNumber = data.code.charAt(0);
    }
    this.isLoading.set(true);
    this.accountingService.createAccount(data).subscribe({
      next: () => {
        this.showToast('Cuenta creada exitosamente', 'success');
        this.closeModals();
        this.loadAccounts();
        this.loadStatistics();
      },
      error: (err) => {
        this.showToast(err.error?.message || 'Error al crear la cuenta', 'error');
        this.isLoading.set(false);
      },
    });
  }

  updateAccount() {
    if (this.accountForm.invalid) {
      this.accountForm.markAllAsTouched();
      return;
    }
    const account = this.selectedAccount();
    if (!account) return;

    const data = this.accountForm.value;
    this.isLoading.set(true);
    this.accountingService.updateAccount(account.id, data).subscribe({
      next: () => {
        this.showToast('Cuenta actualizada exitosamente', 'success');
        this.closeModals();
        this.loadAccounts();
        this.loadStatistics();
      },
      error: (err) => {
        this.showToast(err.error?.message || 'Error al actualizar la cuenta', 'error');
        this.isLoading.set(false);
      },
    });
  }

  deleteAccount(account: Account) {
    if (!confirm(`¿Eliminar la cuenta ${account.code} - ${account.name}?`)) return;
    this.accountingService.deleteAccount(account.id).subscribe({
      next: () => {
        this.showToast('Cuenta eliminada', 'success');
        this.loadAccounts();
        this.loadStatistics();
      },
      error: (err) => {
        this.showToast(err.error?.message || 'Error al eliminar', 'error');
      },
    });
  }

  toggleActive(account: Account) {
    this.accountingService
      .updateAccount(account.id, { isActive: !account.isActive } as any)
      .subscribe({
        next: () => {
          this.showToast(
            account.isActive ? 'Cuenta desactivada' : 'Cuenta activada',
            'success'
          );
          this.loadAccounts();
          this.loadStatistics();
        },
        error: () => this.showToast('Error al cambiar estado', 'error'),
      });
  }

  // Auto-fill fields based on code
  onCodeChange() {
    const code = this.accountForm.get('code')?.value;
    if (!code) return;

    const firstDigit = code.charAt(0);
    this.accountForm.patchValue({ groupNumber: firstDigit });

    // Auto-detect type based on Cuban accounting groups
    const typeMap: Record<string, string> = {
      '1': 'asset',
      '2': 'liability',
      '3': 'equity',
      '4': 'income',
      '5': 'expense',
      '6': 'expense',
      '7': 'income',
      '8': 'asset',
      '9': 'asset',
    };
    const natureMap: Record<string, string> = {
      '1': 'deudora',
      '2': 'acreedora',
      '3': 'acreedora',
      '4': 'acreedora',
      '5': 'deudora',
      '6': 'deudora',
      '7': 'acreedora',
      '8': 'deudora',
      '9': 'deudora',
    };

    if (typeMap[firstDigit]) {
      this.accountForm.patchValue({
        type: typeMap[firstDigit],
        nature: natureMap[firstDigit],
      });
    }

    // Auto-detect level by code length
    this.accountForm.patchValue({ level: code.length });

    // Auto-detect parent code
    if (code.length > 1) {
      this.accountForm.patchValue({ parentCode: code.slice(0, -1) });
    } else {
      this.accountForm.patchValue({ parentCode: '' });
    }
  }

  // Filters
  applyFilters() {
    this.currentPage.set(1);
  }

  resetFilters() {
    this.searchTerm.set('');
    this.typeFilter.set('');
    this.natureFilter.set('');
    this.levelFilter.set('');
    this.activeOnly.set(false);
    this.currentPage.set(1);
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  // Helpers
  getTypeClass(type: string): string {
    const classes: Record<string, string> = {
      asset: 'bg-blue-100 text-blue-800',
      liability: 'bg-red-100 text-red-800',
      equity: 'bg-purple-100 text-purple-800',
      income: 'bg-green-100 text-green-800',
      expense: 'bg-orange-100 text-orange-800',
    };
    return classes[type] || 'bg-slate-100 text-slate-800';
  }

  getNatureClass(nature: string): string {
    return nature === 'deudora'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-cyan-100 text-cyan-800';
  }

  getLevelIndent(level: number): string {
    return `${(level - 1) * 1.5}rem`;
  }

  private showToast(message: string, type: 'success' | 'error' | 'info') {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
