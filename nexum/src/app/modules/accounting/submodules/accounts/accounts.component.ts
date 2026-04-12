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
  showSubaccountModal = signal(false);
  showViewModal = signal(false);
  selectedAccount = signal<Account | null>(null);
  parentAccountForSubaccount = signal<Account | null>(null);

  // Tree expansion state
  expandedNodes = signal<Set<string>>(new Set());

  // Subaccount management
  showSubaccountActions = signal<string | null>(null);

  accountForm: FormGroup;

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
    
    // Ordenar jerárquicamente
    return this.sortHierarchically(filtered);
  });

  // Cuentas para vista de tabla (solo level 3+)
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
    
    // En vista de tabla, solo mostrar cuentas (level 3) y subcuentas (level 4+)
    // Excluir grupos (level 1) y subgrupos (level 2)
    filtered = filtered.filter((a) => a.level >= 3);
    
    // Ordenar por código (sin jerarquía)
    return filtered.sort((a, b) => a.code.localeCompare(b.code));
  });

  sortHierarchically(accounts: Account[]): Account[] {
    // Crear mapa de hijos por padre
    const childrenMap = new Map<string, Account[]>();
    const rootAccounts: Account[] = [];
    
    // Separar cuentas raíz y organizar hijos
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
    
    // Ordenar cada grupo de hijos
    childrenMap.forEach(children => {
      children.sort((a, b) => a.code.localeCompare(b.code));
    });
    
    // Función recursiva para construir la lista ordenada
    const buildHierarchy = (accounts: Account[]): Account[] => {
      const result: Account[] = [];
      accounts.forEach(account => {
        result.push(account);
        const children = childrenMap.get(account.code) || [];
        if (children.length > 0) {
          result.push(...buildHierarchy(children));
        }
      });
      return result;
    };
    
    // Ordenar cuentas raíz y construir jerarquía
    rootAccounts.sort((a, b) => a.code.localeCompare(b.code));
    return buildHierarchy(rootAccounts);
  }

  pagedAccounts = computed(() => {
    // En vista de tabla, usar tableAccounts (solo level 3+)
    // En vista de árbol, usar filteredAccounts (toda la jerarquía)
    const filtered = this.viewMode() === 'table' ? this.tableAccounts() : this.filteredAccounts();
    const start = (this.currentPage() - 1) * this.pageSize;
    return filtered.slice(start, start + this.pageSize);
  });

  treeAccounts = computed(() => {
    const filtered = this.filteredAccounts();
    // Usar la misma lógica jerárquica que en sortHierarchically
    return this.buildTreeStructure(filtered);
  });

  buildTreeStructure(accounts: Account[]): Account[] {
    // Crear mapa de hijos por padre
    const childrenMap = new Map<string, Account[]>();
    const rootAccounts: Account[] = [];
    
    // Separar cuentas raíz y organizar hijos
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
    
    // Función recursiva para construir árbol
    const buildNode = (account: Account): Account => {
      const children = childrenMap.get(account.code) || [];
      return {
        ...account,
        children: children.map(child => buildNode(child))
      };
    };
    
    // Ordenar cuentas raíz y construir árbol
    rootAccounts.sort((a, b) => a.code.localeCompare(b.code));
    return rootAccounts.map(root => buildNode(root));
  }

  paginationConfig = computed(() => ({
    currentPage: this.currentPage(),
    totalItems: this.filteredAccounts().length,
    itemsPerPage: this.pageSize,
    totalPages: Math.ceil(this.filteredAccounts().length / this.pageSize),
  }));

  availableLevels = computed(() => {
    const levels = [...new Set(this.accounts().map((a) => a.level))];
    return levels.sort((a, b) => a - b);
  });

  constructor() {
    this.accountForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^[\d.]{1,20}$/)]],
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

    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.subaccount-dropdown')) {
        this.showSubaccountActions.set(null);
      }
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

  expandAll() {
    const allCodes = this.accounts().map(a => a.code);
    this.expandedNodes.set(new Set(allCodes));
  }

  collapseAll() {
    this.expandedNodes.set(new Set());
  }

  toggleNode(code: string) {
    const current = this.expandedNodes();
    const newSet = new Set(current);
    if (newSet.has(code)) {
      newSet.delete(code);
    } else {
      newSet.add(code);
    }
    this.expandedNodes.set(newSet);
  }

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

  openViewModal(account: Account) {
    this.selectedAccount.set(account);
    this.showViewModal.set(true);
  }

  closeModals() {
    this.showCreateModal.set(false);
    this.showEditModal.set(false);
    this.showSubaccountModal.set(false);
    this.showViewModal.set(false);
    this.showSubaccountModal.set(false);
    this.selectedAccount.set(null);
    this.parentAccountForSubaccount.set(null);
    this.accountForm.reset();
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
    // Calcular nivel automáticamente basándose en el código
    data.level = this.calculateLevelFromCode(data.code);
    this.isLoading.set(true);
    this.accountingService.createAccount(data).subscribe({
      next: () => {
        const accountType = data.level === 1 ? 'Grupo' : data.level === 2 ? 'Subgrupo' : data.level === 3 ? 'Cuenta' : 'Subcuenta';
        this.showToast(`${accountType} creado exitosamente`, 'success');
        this.closeModals();
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
    this.isLoading.set(true);
    this.accountingService.updateAccount(account.id, data).subscribe({
      next: () => {
        const accountType = this.getAccountTypeLabel(account);
        this.showToast(`${accountType} actualizada exitosamente`, 'success');
        this.closeModals();
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

  deleteAccount(account: Account) {
    // Validar si tiene hijos
    const hasChildren = this.accounts().some(a => a.parentCode === account.code);
    if (hasChildren) {
      this.showToast(`No se puede eliminar ${this.getAccountTypeLabel(account).toLowerCase()} que tiene ${this.getChildTypeLabel(account).toLowerCase()}s. Elimine primero los ${this.getChildTypeLabel(account).toLowerCase()}s.`, 'error');
      return;
    }
    if (!confirm(`¿Eliminar ${this.getAccountTypeLabel(account).toLowerCase()} ${account.code} - ${account.name}?`)) return;
    this.accountingService.deleteAccount(account.id).subscribe({
      next: () => {
        const accountType = this.getAccountTypeLabel(account);
        this.showToast(`${accountType} eliminada`, 'success');
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
          const accountType = this.getAccountTypeLabel(account);
          this.showToast(
            account.isActive ? `${accountType} desactivada` : `${accountType} activada`,
            'success'
          );
          this.loadAccounts();
          this.loadStatistics();
        },
        error: () => this.showToast('Error al cambiar estado', 'error'),
      });
  }

  onCodeChange() {
    const code = this.accountForm.get('code')?.value;
    if (!code) return;

    const firstDigit = code.charAt(0);
    this.accountForm.patchValue({ groupNumber: firstDigit });

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
    if (typeMap[firstDigit]) {
      this.accountForm.patchValue({ type: typeMap[firstDigit] });
    }

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

    // Sistema híbrido: decimal para subgrupos, numérico para cuentas
    const level = this.getLevelFromCode(code);
    this.accountForm.patchValue({ level });

    const parentCode = this.getParentCode(code);
    this.accountForm.patchValue({ parentCode });
  }

  getLevelFromCode(code: string): number {
    // Si tiene puntos, es sistema decimal (subgrupos)
    if (code.includes('.')) {
      return code.split('.').length;
    }
    // Si no tiene puntos, es sistema numérico (cuentas)
    // El nivel se basa en la longitud y el contexto
    if (code.length === 1) return 1; // 10, 20, etc.
    if (code.length === 2) return 2; // 10.1, 20.1, etc.
    return 3; // 101, 102, etc.
  }

  getParentCode(code: string): string {
    // Si tiene puntos, eliminar el último segmento
    if (code.includes('.')) {
      const parts = code.split('.');
      if (parts.length <= 1) return '';
      return parts.slice(0, -1).join('.');
    }
    // Si no tiene puntos y es de 3 dígitos, buscar subgrupo padre
    if (code.length === 3) {
      const firstTwo = code.substring(0, 2);
      return `${firstTwo.substring(0, 1)}.${firstTwo.substring(1)}`;
    }
    return '';
  }

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
    return `${(level - 1) * 1.5}rem`; // Indentación para cada nivel jerárquico
  }

  openSubaccountModal(parentAccount: Account) {
    this.parentAccountForSubaccount.set(parentAccount);
    this.accountForm.reset({
      code: '',
      name: '',
      description: '',
      type: parentAccount.type,
      nature: parentAccount.nature,
      level: parentAccount.level + 1,
      groupNumber: parentAccount.groupNumber,
      parentCode: parentAccount.code,
      isActive: true,
      allowsMovements: parentAccount.allowsMovements,
    });
    this.showSubaccountModal.set(true);
  }

  createSubaccount() {
    if (this.accountForm.invalid) {
      this.accountForm.markAllAsTouched();
      return;
    }
    const data = this.accountForm.value;
    const parent = this.parentAccountForSubaccount();
    if (!parent) return;

    if (!data.code.startsWith(parent.code)) {
      this.showToast(`El código de ${this.getChildTypeLabel(parent).toLowerCase()} debe comenzar con el código de ${this.getChildTypeLabel(parent).toLowerCase()} padre`, 'error');
      return;
    }

    // Calcular nivel automáticamente basándose en el código
    data.level = this.calculateLevelFromCode(data.code);

    this.isLoading.set(true);
    this.accountingService.createAccount(data).subscribe({
      next: () => {
        this.showToast(`${this.getChildTypeLabel(parent)} creada bajo ${parent.name}`, 'success');
        this.closeModals();
        this.loadAccounts();
        this.loadStatistics();
        this.toggleNode(parent.code);
      },
      error: (err) => {
        this.showToast(err.error?.message || `Error al crear ${this.getChildTypeLabel(parent).toLowerCase()}`, 'error');
        this.isLoading.set(false);
      },
    });
  }

  getSubaccounts(account: Account): Account[] {
    return this.accounts().filter(a => a.parentCode === account.code);
  }

  hasSubaccounts(account: Account): boolean {
    return this.accounts().some(a => a.parentCode === account.code);
  }

  canHaveSubaccounts(account: Account): boolean {
    // Jerarquía: Grupo (1) → Subgrupo (2) → Cuenta (3) → Subcuenta (4+)
    // Grupos (level 1) y Subgrupos (level 2) NO pueden tener hijos (son fijos)
    // Solo Cuentas (level 3) pueden tener subcuentas (level 4+)
    // Subcuentas (level 4+) pueden tener más subcuentas
    return account.level >= 3 && account.level < 9 && account.isActive;
  }

  getChildTypeLabel(account: Account): string {
    // Solo cuentas (level 3) pueden tener subcuentas
    if (account.level >= 3) return 'Subcuenta';
    return '';
  }

  getAccountTypeLabel(account: Account): string {
    if (account.level === 1) return 'Grupo';
    if (account.level === 2) return 'Subgrupo';
    if (account.level === 3) return 'Cuenta';
    return 'Subcuenta';
  }

  getChildLevel(account: Account): number {
    return account.level + 1;
  }

  calculateLevelFromCode(code: string): number {
    // Calcular nivel basándose en el código según el nomenclador cubano 2016
    // 10 = nivel 1 (grupo)
    // 10.1 = nivel 2 (subgrupo)
    // 101 = nivel 3 (cuenta)
    // 101.1 = nivel 4 (subcuenta)
    // 101.2.3 = nivel 5 (sub-subcuenta)
    
    // Si el código está vacío, retornar 1 por defecto
    if (!code) return 1;
    
    const dotCount = (code.match(/\./g) || []).length;
    
    // Si no tiene puntos
    if (dotCount === 0) {
      if (code.length <= 2) return 1; // 10, 20, etc. son grupos (nivel 1)
      if (code.length === 3) return 3; // 101, 102, etc. son cuentas (nivel 3)
      return 1; // Por defecto
    }
    
    // Si tiene puntos, obtener la parte antes del primer punto
    const firstPart = code.split('.')[0];
    
    // Si la parte antes del primer punto tiene 2 dígitos (ej: 10.1)
    if (firstPart.length === 2) {
      return 2; // 10.1, 10.2, etc. son subgrupos (nivel 2)
    }
    
    // Si la parte antes del primer punto tiene 3 o más dígitos (ej: 101.1, 101.2.3)
    if (firstPart.length >= 3) {
      // Verificar si el código termina con un punto (el usuario está escribiendo)
      if (code.endsWith('.')) {
        return firstPart.length + 1; // 101. → nivel 4
      }
      return firstPart.length + dotCount; // 101.1 → nivel 4, 101.2.3 → nivel 5
    }
    
    return 1; // Por defecto
  }

  toggleSubaccountActions(accountCode: string, event?: Event) {
    if (event) event.stopPropagation();
    const current = this.showSubaccountActions();
    this.showSubaccountActions.set(current === accountCode ? null : accountCode);
  }

  private showToast(message: string, type: 'success' | 'error' | 'info') {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3000);
  }
}