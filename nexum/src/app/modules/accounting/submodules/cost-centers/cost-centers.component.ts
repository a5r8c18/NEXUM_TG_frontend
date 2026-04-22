import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AccountingService, CostCenter, CostCenterFilters, CostCenterStatistics } from '../../../../core/services/accounting.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-cost-centers',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: './cost-centers.component.html',
})
export class CostCentersComponent implements OnInit {
  private accountingService = inject(AccountingService);
  private fb = inject(FormBuilder);
  private confirmDialog = inject(ConfirmDialogService);

  costCenters = signal<CostCenter[]>([]);
    isLoading = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Filters
  searchTerm = signal('');
  activeOnly = signal(false);

  // Pagination
  currentPage = signal(1);
  pageSize = 20;

  // Modals
  showCreateModal = signal(false);
  showEditModal = signal(false);
  selectedCostCenter = signal<CostCenter | null>(null);

  costCenterForm: FormGroup;

  // Cost center labels
  typeLabels: Record<string, string> = {
    production: 'Producción',
    administrative: 'Administrativo',
    sales: 'Ventas',
    maintenance: 'Mantenimiento',
    research: 'Investigación',
    marketing: 'Marketing',
    general: 'General',
  };

  filteredCostCenters = computed(() => {
    let filtered = this.costCenters();
    const term = this.searchTerm().toLowerCase();
    if (term) {
      filtered = filtered.filter(
        (cc) =>
          cc.name.toLowerCase().includes(term) ||
          cc.code.toLowerCase().includes(term) ||
          (cc.description && cc.description.toLowerCase().includes(term))
      );
    }
    if (this.activeOnly()) {
      filtered = filtered.filter((cc) => cc.isActive);
    }
    return filtered;
  });

  pagedCostCenters = computed(() => {
    const filtered = this.filteredCostCenters();
    const start = (this.currentPage() - 1) * this.pageSize;
    return filtered.slice(start, start + this.pageSize);
  });

  paginationConfig = computed(() => ({
    currentPage: this.currentPage(),
    totalItems: this.filteredCostCenters().length,
    itemsPerPage: this.pageSize,
    totalPages: Math.ceil(this.filteredCostCenters().length / this.pageSize),
  }));

  constructor() {
    this.costCenterForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^[A-Z0-9\-]{2,15}$/)]],
      name: ['', [Validators.required, Validators.minLength(2)]],
      manager: [''],
      isActive: [true],
    });
  }

  ngOnInit() {
    this.loadCostCenters();
  }

  loadCostCenters() {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.accountingService.getCostCenters().subscribe({
      next: (data) => {
        this.costCenters.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  
  // Actions
  openCreateModal() {
    this.costCenterForm.reset({
      code: '',
      name: '',
      description: '',
      type: 'production',
      manager: '',
      budget: 0,
      isActive: true,
    });
    this.showCreateModal.set(true);
  }

  openEditModal(costCenter: CostCenter) {
    this.selectedCostCenter.set(costCenter);
    this.costCenterForm.patchValue({
      code: costCenter.code,
      name: costCenter.name,
      description: costCenter.description || '',
      type: costCenter.type,
      manager: costCenter.manager || '',
      budget: costCenter.budget || 0,
      isActive: costCenter.isActive,
    });
    this.showEditModal.set(true);
  }

  closeModals() {
    this.showCreateModal.set(false);
    this.showEditModal.set(false);
    this.selectedCostCenter.set(null);
  }

  createCostCenter() {
    if (this.costCenterForm.invalid) return;

    const costCenter = this.costCenterForm.value;
    this.accountingService.createCostCenter(costCenter).subscribe({
      next: () => {
        this.showToast('Centro de costo creado correctamente', 'success');
        this.closeModals();
        this.loadCostCenters();
      },
      error: () => {
        this.showToast('Error al crear centro de costo', 'error');
      },
    });
  }

  updateCostCenter() {
    if (this.costCenterForm.invalid || !this.selectedCostCenter()) return;

    const costCenter = {
      ...this.selectedCostCenter(),
      ...this.costCenterForm.value,
    };
    
    this.accountingService.updateCostCenter(costCenter.id, costCenter).subscribe({
      next: () => {
        this.showToast('Centro de costo actualizado correctamente', 'success');
        this.closeModals();
        this.loadCostCenters();
      },
      error: () => {
        this.showToast('Error al actualizar centro de costo', 'error');
      },
    });
  }

  toggleActive(costCenter: CostCenter) {
    const updatedCostCenter = { ...costCenter, isActive: !costCenter.isActive };
    this.accountingService.updateCostCenter(costCenter.id, updatedCostCenter).subscribe({
      next: () => {
        const action = updatedCostCenter.isActive ? 'activado' : 'desactivado';
        this.showToast(`Centro de costo ${action} correctamente`, 'success');
        this.loadCostCenters();
      },
      error: () => {
        this.showToast('Error al cambiar estado del centro de costo', 'error');
      },
    });
  }

  async deleteCostCenter(costCenter: CostCenter) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar centro de costo',
      message: `¿Está seguro de eliminar el centro de costo ${costCenter.name}?`,
      confirmText: 'Eliminar',
      type: 'danger'
    });
    if (!confirmed) return;
    this.accountingService.deleteCostCenter(costCenter.id).subscribe({
      next: () => {
        this.showToast('Centro de costo eliminado correctamente', 'success');
        this.loadCostCenters();
      },
      error: () => {
        this.showToast('Error al eliminar centro de costo', 'error');
      },
    });
  }

  // Filters
  applyFilters() {
    this.currentPage.set(1);
  }

  resetFilters() {
    this.searchTerm.set('');
    this.activeOnly.set(false);
    this.currentPage.set(1);
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  // Helper methods
  getTypeClass(type: string): string {
    const classes: Record<string, string> = {
      production: 'bg-blue-100 text-blue-800',
      administrative: 'bg-purple-100 text-purple-800',
      sales: 'bg-green-100 text-green-800',
      maintenance: 'bg-orange-100 text-orange-800',
      research: 'bg-indigo-100 text-indigo-800',
      marketing: 'bg-pink-100 text-pink-800',
      general: 'bg-slate-100 text-slate-800',
    };
    return classes[type] || 'bg-slate-100 text-slate-800';
  }

  private showToast(message: string, type: 'success' | 'error' | 'info') {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
