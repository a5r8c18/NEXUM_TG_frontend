import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { Subject } from 'rxjs';
import { AccountingService, Account, AccountFilters, AccountStatistics, Subaccount } from '../../../../core/services/accounting.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './accounts.component.html',
})
export class AccountsComponent implements OnInit {
  private accountingService = inject(AccountingService);
  private fb = inject(FormBuilder);
  private confirmDialog = inject(ConfirmDialogService);

  accounts = signal<Account[]>([]);
  subaccounts = signal<Record<string, Account[]>>({});
  statistics = signal<AccountStatistics | null>(null);
  isLoading = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Search and filters
  searchTerm = signal('');
  typeFilter = signal('');
  natureFilter = signal('');
  levelFilter = signal('');
  activeOnly = signal(false);
  searchSubject = new Subject<string>();

  // Pagination
  currentPage = signal(1);
  pageSize = 10;

  // View mode
  viewMode = signal<'tree' | 'table'>('table');

  // Tree expansion
  expandedNodes = signal<Set<string>>(new Set());

  // Subaccounts dropdown
  expandedSubaccounts = signal<Set<string>>(new Set());
  subaccountsLoading = signal<Set<string>>(new Set());

  // Form
  accountForm = this.fb.group({
    code: ['', [Validators.required]],
    name: ['', [Validators.required]],
    description: [''],
    type: ['balance', [Validators.required]],
    nature: ['deudora', [Validators.required]],
    parentId: [''],
    allowsMovements: [false],
    isActive: [true],
    groupNumber: [''],
    level: [1]
  });

  // Modals
  showCreateModal = signal(false);
  showEditModal = signal(false);
  showViewModal = signal(false);
  selectedAccount = signal<Account | null>(null);

  // Subaccount modals
  showSubaccountCreateModal = signal(false);
  showSubaccountEditModal = signal(false);
  selectedSubaccount = signal<Subaccount | null>(null);
  selectedAccountForSubaccount = signal<Account | null>(null);

  // Subaccount form
  subaccountForm = this.fb.group({
    accountId: ['', [Validators.required]],
    subaccountCode: ['', [Validators.required]],
    subaccountName: ['', [Validators.required]],
    description: [''],
    type: ['expense', [Validators.required]],
    nature: ['deudora', [Validators.required]],
    isActive: [true],
    allowsMovements: [true]
  });

  // Labels
  typeLabels = {
    asset: 'Activo',
    liability: 'Pasivo',
    equity: 'Patrimonio',
    income: 'Ingreso',
    expense: 'Egreso',
    balance: 'Balance',
    resultados: 'Resultados'
  };

  natureLabels = {
    deudora: 'Deudora',
    acreedora: 'Acreedora'
  };

  ngOnInit() {
    this.setupDebouncedSearch();
    this.loadAccounts();
    this.loadStatistics();
  }

  private setupDebouncedSearch() {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage.set(1);
      });
  }

  loadAccounts() {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.accountingService.getAccounts().subscribe({
      next: (accounts) => {
        console.log('Cuentas cargadas:', accounts);
        console.log('Cuenta 101:', accounts.find(a => a.code === '101'));
        this.accounts.set(accounts);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading accounts:', err);
        this.hasError.set(true);
        this.isLoading.set(false);
        this.showToast('Error al cargar las cuentas', 'error');
      },
    });
  }

  loadStatistics() {
    this.accountingService.getAccountStatistics().subscribe({
      next: (stats) => {
        this.statistics.set(stats);
      },
      error: (err) => {
        console.error('Error loading statistics:', err);
      },
    });
  }

  // Computed properties
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

  treeAccounts = computed(() => {
    const filtered = this.filteredAccounts();
    // Ordenar jerárquicamente
    return this.sortHierarchically(filtered);
  });

  tableAccounts = computed(() => {
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
    
    // En vista de tabla, mostrar solo cuentas (level 3), las subcuentas (level 4) solo en dropdown
    filtered = filtered.filter((a) => a.level === 3);
    
    console.log('TableAccounts (level 3):', filtered);
    console.log('Cuenta 101 en tableAccounts:', filtered.find(a => a.code === '101'));
    
    // Ordenar por código (sin jerarquía)
    return filtered.sort((a, b) => a.code.localeCompare(b.code));
  });

  pagedAccounts = computed(() => {
    const start = this.getStartIndex();
    const end = this.getEndIndex();
    return this.tableAccounts().slice(start, end);
  });

  sortHierarchically(accounts: Account[]): Account[] {
    const childrenMap = new Map<string, Account[]>();
    const rootAccounts: Account[] = [];
    
    accounts.forEach(account => {
      const parentCode = account.parentCode || '';
      if (!parentCode) {
        rootAccounts.push(account);
      } else {
        if (!childrenMap.has(parentCode)) {
          childrenMap.set(parentCode, []);
        }
        childrenMap.get(parentCode)!.push(account);
      }
    });
    
    const buildHierarchy = (account: Account): Account => {
      const children = childrenMap.get(account.code) || [];
      return {
        ...account,
        children: children.map(child => buildHierarchy(child))
      };
    };
    
    return rootAccounts.map(account => buildHierarchy(account));
  }

  // Pagination methods
  getStartIndex(): number {
    return (this.currentPage() - 1) * this.pageSize;
  }

  getEndIndex(): number {
    return this.getStartIndex() + this.pageSize;
  }

  getTotalPages(): number {
    return Math.ceil(this.tableAccounts().length / this.pageSize);
  }

  previousPage() {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  nextPage() {
    if (this.currentPage() < this.getTotalPages()) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  // Tree expansion methods
  toggleExpanded(accountCode: string) {
    const current = new Set(this.expandedNodes());
    if (current.has(accountCode)) {
      current.delete(accountCode);
    } else {
      current.add(accountCode);
    }
    this.expandedNodes.set(current);
  }

  isExpanded(accountCode: string): boolean {
    return this.expandedNodes().has(accountCode);
  }

  // Subaccounts dropdown methods
  toggleSubaccountsDropdown(accountId: string) {
    const current = new Set(this.expandedSubaccounts());
    const loading = new Set(this.subaccountsLoading());
    
    if (current.has(accountId)) {
      // Cerrar dropdown
      current.delete(accountId);
      this.expandedSubaccounts.set(current);
    } else {
      // Abrir dropdown y cargar subcuentas si no están cargadas
      if (!this.subaccounts()[accountId]) {
        loading.add(accountId);
        this.subaccountsLoading.set(loading);
        
        // Cargar subcuentas y luego abrir dropdown
        this.loadSubaccountsForAccount(accountId);
        
        // Simular carga y abrir dropdown después de un breve tiempo
        setTimeout(() => {
          const newLoading = new Set(this.subaccountsLoading());
          newLoading.delete(accountId);
          this.subaccountsLoading.set(newLoading);
          
          // Abrir dropdown después de cargar
          const newExpanded = new Set(this.expandedSubaccounts());
          newExpanded.add(accountId);
          this.expandedSubaccounts.set(newExpanded);
        }, 500);
      } else {
        // Abrir dropdown directamente si ya están cargadas
        current.add(accountId);
        this.expandedSubaccounts.set(current);
      }
    }
  }

  isSubaccountsDropdownExpanded(accountId: string): boolean {
    return this.expandedSubaccounts().has(accountId);
  }

  isSubaccountsLoading(accountId: string): boolean {
    return this.subaccountsLoading().has(accountId);
  }

  // Método para verificar si una cuenta tiene subcuentas
  hasSubaccounts(accountId: string): boolean {
    console.log(`hasSubaccounts called for accountId: ${accountId}`);
    console.log('Subaccounts loaded:', this.subaccounts());
    
    // Si no están cargadas, cargarlas primero
    if (!this.subaccounts()[accountId]) {
      console.log('Loading subaccounts for account:', accountId);
      // Disparar carga asíncrona pero no esperar aquí
      this.loadSubaccountsForAccount(accountId);
    }
    
    // Verificar si hay subcuentas cargadas
    const subaccounts = this.getSubaccountsForAccount(accountId);
    console.log(`Subaccounts for ${accountId}:`, subaccounts);
    return subaccounts.length > 0;
  }

  // Método para cargar subcuentas si no están cargadas y verificar si tiene
  async checkAndLoadSubaccounts(accountId: string): Promise<boolean> {
    if (!this.subaccounts()[accountId]) {
      // Cargar subcuentas si no están cargadas
      this.loadSubaccountsForAccount(accountId);
      // Esperar un poco a que carguen y verificar
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    return this.hasSubaccounts(accountId);
  }

  // Método de depuración para el template
  debugDropdown(account: Account) {
    console.log('Dropdown condition true for account:', account.code, 'level:', account.level);
    return true;
  }

  // Filter methods
  resetFilters() {
    this.searchTerm.set('');
    this.typeFilter.set('');
    this.natureFilter.set('');
    this.levelFilter.set('');
    this.activeOnly.set(false);
    this.currentPage.set(1);
  }

  // Account operations
  openCreateModal() {
    this.accountForm.reset({
      code: '',
      name: '',
      description: '',
      type: 'balance',
      nature: 'deudora',
      parentId: '',
      allowsMovements: false,
      isActive: true,
      groupNumber: '',
      level: 1
    });
    this.selectedAccount.set(null);
    this.showCreateModal.set(true);
    this.showEditModal.set(false);
    this.showViewModal.set(false);
  }

  openEditModal(account: Account) {
    this.selectedAccount.set(account);
    this.accountForm.patchValue({
      code: account.code,
      name: account.name,
      description: account.description || '',
      type: account.type,
      nature: account.nature,
      parentId: account.parentAccountId || '',
      allowsMovements: account.allowsMovements,
      isActive: account.isActive,
      groupNumber: account.groupNumber || '',
      level: account.level
    });
    this.showCreateModal.set(false);
    this.showEditModal.set(true);
    this.showViewModal.set(false);
  }

  openViewModal(account: Account) {
    this.selectedAccount.set(account);
    this.showCreateModal.set(false);
    this.showEditModal.set(false);
    this.showViewModal.set(true);
  }

  viewSubaccountDetails(subaccount: Account) {
    this.selectedAccount.set(subaccount);
    this.showCreateModal.set(false);
    this.showEditModal.set(false);
    this.showViewModal.set(true);
  }

  closeAllModals() {
    this.showCreateModal.set(false);
    this.showEditModal.set(false);
    this.showViewModal.set(false);
    this.selectedAccount.set(null);
  }

  saveAccount() {
    if (this.showCreateModal()) {
      this.createAccount();
    } else if (this.showEditModal()) {
      this.updateAccount();
    }
  }

  createAccount() {
    if (this.accountForm.invalid) {
      this.accountForm.markAllAsTouched();
      return;
    }
    const data = this.accountForm.value;
    if (!data.groupNumber && data.code) {
      data.groupNumber = data.code.charAt(0);
    }
    data.level = this.calculateLevelFromCode(data.code || '');
    
    // Convert form data to match Account interface
    const accountData: Partial<Account> = {
      code: data.code || '',
      name: data.name || '',
      description: data.description || null,
      type: data.type as 'asset' | 'liability' | 'equity' | 'income' | 'expense',
      nature: data.nature as 'deudora' | 'acreedora',
      level: data.level || 1,
      groupNumber: data.groupNumber || null,
      parentCode: data.parentId || null,
      parentAccountId: data.parentId || null,
      balance: 0,
      isActive: data.isActive ?? true,
      allowsMovements: data.allowsMovements ?? false
    };
    
    this.isLoading.set(true);
    this.accountingService.createAccount(accountData).subscribe({
      next: () => {
        const accountType = data.level === 1 ? 'Grupo' : data.level === 2 ? 'Subgrupo' : data.level === 3 ? 'Cuenta' : 'Subcuenta';
        this.showToast(`${accountType} creado exitosamente`, 'success');
        this.closeAllModals();
        this.loadAccounts();
        this.loadStatistics();
      },
      error: (err) => {
        this.showToast(err.error?.message || 'Error al crear', 'error');
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
    
    // Convert form data to match Account interface
    const accountData: Partial<Account> = {
      code: data.code || '',
      name: data.name || '',
      description: data.description || null,
      type: data.type as 'asset' | 'liability' | 'equity' | 'income' | 'expense',
      nature: data.nature as 'deudora' | 'acreedora',
      level: data.level || account.level,
      groupNumber: data.groupNumber || account.groupNumber,
      parentCode: data.parentId || account.parentCode,
      parentAccountId: data.parentId || account.parentAccountId,
      isActive: data.isActive ?? account.isActive,
      allowsMovements: data.allowsMovements ?? account.allowsMovements
    };
    
    this.isLoading.set(true);
    this.accountingService.updateAccount(account.id, accountData).subscribe({
      next: () => {
        const accountType = this.getAccountTypeLabel(account);
        this.showToast(`${accountType} actualizada exitosamente`, 'success');
        this.closeAllModals();
        this.loadAccounts();
        this.loadStatistics();
      },
      error: (err) => {
        const accountType = this.getAccountTypeLabel(account);
        this.showToast(err.error?.message || `Error al actualizar ${accountType.toLowerCase()}`, 'error');
        this.isLoading.set(false);
      },
    });
  }

  async deleteAccount(account: Account, parentAccountId?: string) {
    const isSubaccount = parentAccountId !== undefined;
    const accountType = isSubaccount ? 'Subcuenta' : 'Cuenta';
    
    const confirmed = await this.confirmDialog.confirm(
      `Eliminar ${accountType}`,
      `¿Está seguro de eliminar la ${accountType.toLowerCase()} "${account.code || ''} - ${account.name || ''}"?`,
      {
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        type: 'warning'
      }
    );
    
    if (!confirmed) return;
    
    this.accountingService.deleteAccount(account.id || '').subscribe({
      next: () => {
        this.showToast(`${accountType} eliminada exitosamente`, 'success');
        this.loadAccounts();
        this.loadStatistics();
        
        // Si es una subcuenta, limpiar el cache de subcuentas del padre
        if (isSubaccount && parentAccountId) {
          const current = { ...this.subaccounts() };
          delete current[parentAccountId];
          this.subaccounts.set(current);
        }
      },
      error: (err) => {
        this.showToast(err.error?.message || `Error al eliminar la ${accountType.toLowerCase()}`, 'error');
      },
    });
  }

  async toggleActive(account: Account) {
    const action = account.isActive ? 'desactivar' : 'activar';
    const confirmed = await this.confirmDialog.confirm(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Cuenta`,
      `¿Está seguro de ${action} la cuenta "${account.code || ''} - ${account.name || ''}"?`,
      {
        confirmText: action.charAt(0).toUpperCase() + action.slice(1),
        cancelText: 'Cancelar',
        type: account.isActive ? 'warning' : 'info'
      }
    );
    
    if (!confirmed) return;
    
    this.accountingService.updateAccount(account.id || '', { isActive: !account.isActive }).subscribe({
      next: () => {
        this.showToast(`Cuenta ${action}da exitosamente`, 'success');
        this.loadAccounts();
        this.loadStatistics();
      },
      error: (err) => {
        this.showToast(err.error?.message || `Error al ${action} la cuenta`, 'error');
      },
    });
  }

  getParentAccounts(): Account[] {
    return this.accounts().filter(account => account.level < 4);
  }

  getAccountTypeLabel(account: Account): string {
    if (account.level === 1) return 'Grupo';
    if (account.level === 2) return 'Subgrupo';
    if (account.level === 3) return 'Cuenta';
    return 'Subcuenta';
  }

  getNatureClass(nature: string): string {
    return nature === 'deudora' 
      ? 'bg-amber-100 text-amber-700' 
      : 'bg-cyan-100 text-cyan-700';
  }

  getLevelIndent(level: number): string {
    const indent = (level - 1) * 16;
    return `${indent}px`;
  }

  calculateLevelFromCode(code: string): number {
    if (!code) return 1;
    
    const dotCount = (code.match(/\./g) || []).length;
    
    if (dotCount === 0) {
      if (code.length <= 2) return 1;
      if (code.length === 3) return 3;
      return 1;
    }
    
    const firstPart = code.split('.')[0];
    
    if (firstPart.length === 2) {
      return 2;
    }
    
    if (firstPart.length >= 3) {
      if (code.endsWith('.')) {
        return firstPart.length + 1;
      }
      return firstPart.length + dotCount;
    }
    
    return 1;
  }

  private showToast(message: string, type: 'success' | 'error' | 'info') {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3000);
  }

  // ── Subaccount operations ──

  loadSubaccountsForAccount(accountId: string) {
    console.log(`loadSubaccountsForAccount called for accountId: ${accountId}`);
    
    if (this.subaccounts()[accountId]) {
      console.log(`Subcuentas ya cargadas para ${accountId}:`, this.subaccounts()[accountId]);
      return; // Ya cargadas
    }

    console.log(`Cargando subcuentas para ${accountId}...`);
    this.accountingService.getSubaccountsByAccount(accountId).subscribe({
      next: (subaccounts) => {
        console.log(`Respuesta del backend para ${accountId}:`, subaccounts);
        const current = { ...this.subaccounts() };
        current[accountId] = subaccounts as unknown as Account[];
        this.subaccounts.set(current);
        console.log(`Subcuentas guardadas para ${accountId}:`, subaccounts);
      },
      error: (err) => {
        console.error('Error loading subaccounts:', err);
        this.showToast('Error al cargar subcuentas', 'error');
      },
    });
  }

  getSubaccountsForAccount(accountId: string): Account[] {
    return this.subaccounts()[accountId] || [];
  }

  openSubaccountCreateModal(account: Account) {
    this.selectedAccountForSubaccount.set(account);
    this.subaccountForm.reset({
      accountId: account.id,
      subaccountCode: '',
      subaccountName: '',
      description: '',
      type: account.type,
      nature: account.nature,
      isActive: true,
      allowsMovements: true
    });
    this.showSubaccountCreateModal.set(true);
  }

  openSubaccountEditModal(subaccount: Subaccount) {
    this.selectedSubaccount.set(subaccount);
    this.subaccountForm.reset({
      accountId: subaccount.accountId,
      subaccountCode: subaccount.subaccountCode,
      subaccountName: subaccount.subaccountName,
      description: subaccount.description || '',
      type: subaccount.type,
      nature: subaccount.nature,
      isActive: subaccount.isActive,
      allowsMovements: subaccount.allowsMovements
    });
    this.showSubaccountEditModal.set(true);
  }

  closeSubaccountModals() {
    this.showSubaccountCreateModal.set(false);
    this.showSubaccountEditModal.set(false);
    this.selectedSubaccount.set(null);
    this.selectedAccountForSubaccount.set(null);
    this.subaccountForm.reset();
  }

  createSubaccount() {
    if (this.subaccountForm.invalid) {
      this.subaccountForm.markAllAsTouched();
      return;
    }

    const data = this.subaccountForm.value;
    this.isLoading.set(true);

    const createData = {
      accountId: data.accountId!,
      subaccountCode: data.subaccountCode!,
      subaccountName: data.subaccountName!,
      description: data.description || undefined
    };

    this.accountingService.createSubaccount(createData).subscribe({
      next: () => {
        this.showToast('Subcuenta creada exitosamente', 'success');
        this.closeSubaccountModals();
        this.loadSubaccountsForAccount(createData.accountId);
      },
      error: (err) => {
        this.showToast(err.error?.message || 'Error al crear la subcuenta', 'error');
        this.isLoading.set(false);
      },
    });
  }

  updateSubaccount() {
    if (this.subaccountForm.invalid) {
      this.subaccountForm.markAllAsTouched();
      return;
    }

    const subaccount = this.selectedSubaccount();
    if (!subaccount) return;

    const data = this.subaccountForm.value;
    this.isLoading.set(true);

    const updateData: Partial<Subaccount> = {
      subaccountCode: data.subaccountCode!,
      subaccountName: data.subaccountName!,
      description: data.description || null,
      type: data.type as 'asset' | 'liability' | 'equity' | 'income' | 'expense',
      nature: data.nature as 'deudora' | 'acreedora',
      isActive: data.isActive ?? true,
      allowsMovements: data.allowsMovements ?? true
    };

    this.accountingService.updateSubaccount(subaccount.id, updateData).subscribe({
      next: () => {
        this.showToast('Subcuenta actualizada exitosamente', 'success');
        this.closeSubaccountModals();
        this.loadSubaccountsForAccount(subaccount.accountId);
      },
      error: (err) => {
        this.showToast(err.error?.message || 'Error al actualizar la subcuenta', 'error');
        this.isLoading.set(false);
      },
    });
  }

  async deleteSubaccount(subaccount: Subaccount) {
    const confirmed = await this.confirmDialog.confirm(
      'Eliminar Subcuenta',
      `¿Está seguro de eliminar la subcuenta "${subaccount.subaccountCode} - ${subaccount.subaccountName}"?`,
      {
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        type: 'warning'
      }
    );

    if (!confirmed) return;

    this.accountingService.deleteSubaccount(subaccount.id).subscribe({
      next: () => {
        this.showToast('Subcuenta eliminada exitosamente', 'success');
        this.loadSubaccountsForAccount(subaccount.accountId);
      },
      error: (err) => {
        this.showToast(err.error?.message || 'Error al eliminar la subcuenta', 'error');
      },
    });
  }

  async toggleSubaccountActive(subaccount: Subaccount) {
    const action = subaccount.isActive ? 'desactivar' : 'activar';
    const confirmed = await this.confirmDialog.confirm(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Subcuenta`,
      `¿Está seguro de ${action} la subcuenta "${subaccount.subaccountCode} - ${subaccount.subaccountName}"?`,
      {
        confirmText: action.charAt(0).toUpperCase() + action.slice(1),
        cancelText: 'Cancelar',
        type: subaccount.isActive ? 'warning' : 'info'
      }
    );

    if (!confirmed) return;

    this.accountingService.toggleSubaccountActive(subaccount.id).subscribe({
      next: () => {
        this.showToast(`Subcuenta ${action}da exitosamente`, 'success');
        this.loadSubaccountsForAccount(subaccount.accountId);
      },
      error: (err) => {
        this.showToast(err.error?.message || `Error al ${action} la subcuenta`, 'error');
      },
    });
  }
}
