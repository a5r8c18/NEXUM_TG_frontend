import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SubelementsService, Subelement, SubelementCategory, SubelementFilters } from '../../../../core/services/subelements.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-elementos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: './elementos.component.html',
})
export class ElementosComponent implements OnInit {
  private subelementsService = inject(SubelementsService);
  private fb = inject(FormBuilder);
  private confirmDialog = inject(ConfirmDialogService);

  // Signals
  subelements = signal<Subelement[]>([]);
  filteredSubelements = signal<Subelement[]>([]);
  categories = signal<SubelementCategory[]>([]);
  isLoading = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  currentPage = signal(1);
  pageSize = 10;
  searchTerm = signal('');
  categoryFilter = signal<SubelementCategory | ''>('');
  activeOnlyFilter = signal(false);

  // Modal
  showModal = signal(false);
  editingSubelement = signal<Subelement | null>(null);
  isSaving = signal(false);

  // Forms
  filterForm: FormGroup;
  subelementForm: FormGroup;

  // Computed properties
  filteredSubelementsList = computed(() => {
    let filtered = this.subelements();

    // Búsqueda textual
    const term = this.searchTerm().toLowerCase();
    if (term) {
      filtered = filtered.filter(sub =>
        sub.code.toLowerCase().includes(term) ||
        sub.name.toLowerCase().includes(term) ||
        (sub.description || '').toLowerCase().includes(term)
      );
    }

    // Filtro por categoría
    if (this.categoryFilter()) {
      filtered = filtered.filter(sub => sub.category === this.categoryFilter());
    }

    // Filtro por estado activo
    if (this.activeOnlyFilter()) {
      filtered = filtered.filter(sub => sub.isActive);
    }

    return filtered;
  });

  pagedSubelements = computed(() => {
    const filtered = this.filteredSubelementsList();
    const start = (this.currentPage() - 1) * this.pageSize;
    return filtered.slice(start, start + this.pageSize);
  });

  paginationConfig = computed(() => ({
    currentPage: this.currentPage(),
    totalItems: this.filteredSubelementsList().length,
    itemsPerPage: this.pageSize,
    totalPages: Math.ceil(this.filteredSubelementsList().length / this.pageSize),
  }));

  uniqueCategories = computed(() => {
    const cats = new Set<SubelementCategory>();
    this.subelements().forEach(sub => cats.add(sub.category));
    return Array.from(cats);
  });

  constructor() {
    this.filterForm = this.fb.group({
      search: [''],
      category: [''],
      activeOnly: [false],
    });

    this.subelementForm = this.fb.group({
      code: ['', Validators.required],
      name: ['', Validators.required],
      category: ['', Validators.required],
      description: [''],
      isActive: [true],
    });

    this.filterForm.valueChanges.subscribe(values => {
      this.searchTerm.set(values.search || '');
      this.categoryFilter.set(values.category || '');
      this.activeOnlyFilter.set(values.activeOnly !== false);
      this.currentPage.set(1);
    });
  }

  ngOnInit() {
    this.loadSubelements();
    this.loadCategories();
  }

  loadSubelements() {
    console.log('Loading subelements...');
    this.isLoading.set(true);
    this.hasError.set(false);

    const filters: SubelementFilters = {
      search: this.searchTerm() || undefined,
      category: this.categoryFilter() || undefined,
      activeOnly: this.activeOnlyFilter(),
    };

    this.subelementsService.findAll(filters).subscribe({
      next: (data) => {
        console.log('Subelements loaded:', data.length, 'items');
        this.subelements.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading subelements:', error);
        this.subelements.set([]);
        this.isLoading.set(false);
        this.hasError.set(true);
      },
    });
  }

  loadCategories() {
    this.subelementsService.getCategories().subscribe({
      next: (data) => {
        this.categories.set(data);
      },
      error: () => {
        this.categories.set([]);
      },
    });
  }

  // Modal actions
  createSubelement() {
    this.editingSubelement.set(null);
    this.subelementForm.reset({
      code: '',
      name: '',
      category: '',
      description: '',
      isActive: true,
    });
    this.showModal.set(true);
  }

  editSubelement(subelement: Subelement) {
    this.editingSubelement.set(subelement);
    this.subelementForm.patchValue({
      code: subelement.code,
      name: subelement.name,
      category: subelement.category,
      description: subelement.description || '',
      isActive: subelement.isActive,
    });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingSubelement.set(null);
  }

  saveSubelement() {
    if (this.subelementForm.invalid) {
      this.showToast('Complete todos los campos requeridos', 'error');
      return;
    }

    const val = this.subelementForm.value;
    const payload = {
      code: val.code,
      name: val.name,
      category: val.category,
      description: val.description || undefined,
      isActive: val.isActive,
    };

    this.isSaving.set(true);

    if (this.editingSubelement()) {
      this.subelementsService.update(this.editingSubelement()!.id, payload).subscribe({
        next: () => {
          this.showToast('Subelemento actualizado correctamente', 'success');
          this.closeModal();
          this.loadSubelements();
          this.isSaving.set(false);
        },
        error: (err) => {
          this.showToast(err.error?.message || 'Error al actualizar subelemento', 'error');
          this.isSaving.set(false);
        },
      });
    } else {
      this.subelementsService.create(payload).subscribe({
        next: () => {
          this.showToast('Subelemento creado correctamente', 'success');
          this.closeModal();
          this.loadSubelements();
          this.isSaving.set(false);
        },
        error: (err) => {
          this.showToast(err.error?.message || 'Error al crear subelemento', 'error');
          this.isSaving.set(false);
        },
      });
    }
  }

  async deleteSubelement(subelement: Subelement) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar subelemento',
      message: `¿Eliminar el subelemento "${subelement.code} - ${subelement.name}"?`,
      confirmText: 'Eliminar',
      type: 'danger'
    });
    if (!confirmed) return;

    this.subelementsService.delete(subelement.id).subscribe({
      next: () => {
        this.showToast('Subelemento eliminado correctamente', 'success');
        this.loadSubelements();
      },
      error: (err) => {
        this.showToast(err.error?.message || 'Error al eliminar subelemento', 'error');
      },
    });
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  resetFilters() {
    this.filterForm.reset({
      search: '',
      category: '',
      activeOnly: false,
    });
    this.currentPage.set(1);
  }

  toggleSubelementStatus(subelement: Subelement) {
    const newStatus = !subelement.isActive;
    this.subelementsService.update(subelement.id, { isActive: newStatus }).subscribe({
      next: () => {
        this.showToast(
          newStatus ? 'Subelemento activado correctamente' : 'Subelemento desactivado correctamente',
          'success'
        );
        this.loadSubelements();
      },
      error: (err) => {
        this.showToast(err.error?.message || 'Error al cambiar estado', 'error');
      },
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
    }).format(amount);
  }

  translateCategory(category: SubelementCategory | ''): string {
    const translations: Record<SubelementCategory, string> = {
      'inventory': 'Inventario',
      'fuel': 'Combustible',
      'energy': 'Energía',
      'personnel': 'Personal',
      'depreciation': 'Depreciación',
      'services': 'Servicios',
      'transfers': 'Transferencias'
    };
    return category ? translations[category] : category;
  }

  private showToast(message: string, type: 'success' | 'error' | 'info') {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
