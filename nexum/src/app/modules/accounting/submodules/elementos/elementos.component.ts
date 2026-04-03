import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AccountingService } from '../../../../core/services/accounting.service';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

export interface AccountingElement {
  id: string;
  companyId: number;
  code: string;
  name: string;
  description: string | null;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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
  elementos = signal<AccountingElement[]>([]);
  isLoading = signal(false);
  hasError = signal(false);
  currentPage = signal(1);
  pageSize = 10;
  searchTerm = signal('');
  typeFilter = signal('');
  categoryFilter = signal('');
  statusFilter = signal('');

  // Form for filters
  filterForm: FormGroup;

  // Form for create/edit
  elementForm: FormGroup;
  showCreateModal = signal(false);
  showEditModal = signal(false);
  editingElement = signal<AccountingElement | null>(null);

  // Computed properties
  filteredElementos = computed(() => {
    let filtered = this.elementos();
    
    // Search filter
    const term = this.searchTerm().toLowerCase();
    if (term) {
      filtered = filtered.filter(elemento => 
        elemento.name.toLowerCase().includes(term) ||
        elemento.code.toLowerCase().includes(term) ||
        elemento.description?.toLowerCase().includes(term)
      );
    }

    // Type filter
    if (this.typeFilter()) {
      filtered = filtered.filter(elemento => elemento.type === this.typeFilter());
    }

    // Category filter
    if (this.categoryFilter()) {
      filtered = filtered.filter(elemento => elemento.category === this.categoryFilter());
    }

    // Status filter
    if (this.statusFilter()) {
      const isActive = this.statusFilter() === 'active';
      filtered = filtered.filter(elemento => elemento.isActive === isActive);
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

  // Statistics
  statistics = computed(() => {
    const elementos = this.elementos();
    const active = elementos.filter(e => e.isActive).length;
    const inactive = elementos.filter(e => !e.isActive).length;

    const byType = {
      asset: elementos.filter(e => e.type === 'asset').length,
      liability: elementos.filter(e => e.type === 'liability').length,
      equity: elementos.filter(e => e.type === 'equity').length,
      income: elementos.filter(e => e.type === 'income').length,
      expense: elementos.filter(e => e.type === 'expense').length,
    };

    return {
      total: elementos.length,
      active,
      inactive,
      byType
    };
  });

  // Unique categories for filter
  uniqueCategories = computed(() => {
    const categories = new Set();
    this.elementos().forEach(elemento => {
      if (elemento.category) {
        categories.add(elemento.category);
      }
    });
    return Array.from(categories).sort();
  });

  constructor() {
    this.filterForm = this.fb.group({
      search: [''],
      type: [''],
      category: [''],
      status: ['']
    });

    this.elementForm = this.fb.group({
      code: ['', [Validators.required]],
      name: ['', [Validators.required]],
      description: [''],
      type: ['asset', [Validators.required]],
      category: ['', [Validators.required]],
      isActive: [true]
    });

    // Watch filter form changes
    this.filterForm.valueChanges.subscribe(values => {
      this.searchTerm.set(values.search || '');
      this.typeFilter.set(values.type || '');
      this.categoryFilter.set(values.category || '');
      this.statusFilter.set(values.status || '');
      this.currentPage.set(1);
    });
  }

  ngOnInit() {
    this.loadElementos();
  }

  loadElementos() {
    this.isLoading.set(true);
    this.hasError.set(false);
    
    // TODO: Implement getElementos method in AccountingService
    // this.accountingService.getElementos().subscribe({
    //   next: (data) => {
    //     this.elementos.set(data);
    //     this.isLoading.set(false);
    //   },
    //   error: () => {
    //     this.hasError.set(true);
    //     this.isLoading.set(false);
    //   }
    // });
    
    // Mock data for now
    setTimeout(() => {
      this.elementos.set([
        {
          id: '1',
          companyId: 1,
          code: 'E-001',
          name: 'Caja y Bancos',
          description: 'Efectivo en caja y cuentas bancarias',
          type: 'asset',
          category: 'Corriente',
          isActive: true,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        },
        {
          id: '2',
          companyId: 1,
          code: 'E-002',
          name: 'Cuentas por Cobrar',
          description: 'Derechos de cobro a clientes',
          type: 'asset',
          category: 'Corriente',
          isActive: true,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        },
        {
          id: '3',
          companyId: 1,
          code: 'E-003',
          name: 'Proveedores',
          description: 'Obligaciones con proveedores',
          type: 'liability',
          category: 'Corriente',
          isActive: true,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        },
        {
          id: '4',
          companyId: 1,
          code: 'E-004',
          name: 'Capital Social',
          description: 'Capital aportado por los socios',
          type: 'equity',
          category: 'Patrimonio',
          isActive: true,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        },
        {
          id: '5',
          companyId: 1,
          code: 'E-005',
          name: 'Ventas',
          description: 'Ingresos por ventas de bienes y servicios',
          type: 'income',
          category: 'Operacional',
          isActive: true,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        },
        {
          id: '6',
          companyId: 1,
          code: 'E-006',
          name: 'Costos de Ventas',
          description: 'Costos directamente relacionados con ventas',
          type: 'expense',
          category: 'Operacional',
          isActive: true,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        }
      ]);
      this.isLoading.set(false);
    }, 100);
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  resetFilters() {
    this.filterForm.reset();
    this.currentPage.set(1);
  }

  openCreateModal() {
    this.elementForm.reset({
      code: '',
      name: '',
      description: '',
      type: 'asset',
      category: '',
      isActive: true
    });
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
  }

  createElement() {
    if (this.elementForm.invalid) return;
    
    // TODO: Implement createElement method
    console.log('Create element:', this.elementForm.value);
    this.closeCreateModal();
  }

  openEditModal(elemento: AccountingElement) {
    this.editingElement.set(elemento);
    this.elementForm.patchValue({
      code: elemento.code,
      name: elemento.name,
      description: elemento.description || '',
      type: elemento.type,
      category: elemento.category,
      isActive: elemento.isActive
    });
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
    this.editingElement.set(null);
  }

  updateElement() {
    if (this.elementForm.invalid) return;
    
    // TODO: Implement updateElement method
    console.log('Update element:', this.editingElement()?.id, this.elementForm.value);
    this.closeEditModal();
  }

  deleteElement(elemento: AccountingElement) {
    if (!confirm(`¿Eliminar el elemento ${elemento.code} - ${elemento.name}?`)) return;
    
    // TODO: Implement deleteElement method
    console.log('Delete element:', elemento);
  }

  toggleElementStatus(elemento: AccountingElement) {
    // TODO: Implement toggleElementStatus method
    console.log('Toggle status:', elemento);
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'asset': 'Activo',
      'liability': 'Pasivo',
      'equity': 'Patrimonio',
      'income': 'Ingreso',
      'expense': 'Egreso'
    };
    return labels[type] || type;
  }

  getTypeClass(type: string): string {
    const classes: Record<string, string> = {
      'asset': 'bg-blue-100 text-blue-800',
      'liability': 'bg-red-100 text-red-800',
      'equity': 'bg-green-100 text-green-800',
      'income': 'bg-emerald-100 text-emerald-800',
      'expense': 'bg-amber-100 text-amber-800'
    };
    return classes[type] || 'bg-gray-100 text-gray-800';
  }

  getStatusClass(isActive: boolean): string {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  }

  getStatusLabel(isActive: boolean): string {
    return isActive ? 'Activo' : 'Inactivo';
  }

  // Helper methods for template
  abs(value: number): number {
    return Math.abs(value);
  }

  objectKeys(obj: any): string[] {
    return Object.keys(obj);
  }
}
