import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CompanyService } from '../../../../core/services/company.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Company, CreateCompanyDto } from '../../../../models/company.models';
import { PaginationComponent, PaginationConfig } from '../../../../shared/components/pagination/pagination.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-warehouses',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent, ModalComponent],
  templateUrl: './warehouses.component.html',
})
export class WarehousesComponent implements OnInit, OnDestroy {
  private companyService = inject(CompanyService);
  private notificationService = inject(NotificationService);

  companies = signal<Company[]>([]);
  isLoading = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // UI state
  currentPage = signal(1);
  pageSize = 8;
  searchTerm = signal('');
  isCreateOpen = signal(false);
  isEditOpen = signal(false);
  selectedCompany = signal<Company | null>(null);

  // Form data
  formData = signal<CreateCompanyDto>({
    name: '',
    tax_id: '',
    address: '',
    phone: '',
    email: '',
    logo_path: '',
  });

  private refreshSub!: Subscription;
  private toastSub!: Subscription;

  ngOnInit(): void {
    this.loadCompanies();
    this.refreshSub = this.notificationService.refresh$.subscribe(() => this.loadCompanies());
    this.toastSub = this.notificationService.toasts$.subscribe(t => {
      this.toast.set(t);
      setTimeout(() => this.toast.set(null), 4000);
    });
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
    this.toastSub?.unsubscribe();
  }

  loadCompanies(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.companyService.getCompanies().subscribe({
      next: (data) => {
        this.companies.set(data);
        this.currentPage.set(1);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
        this.showToast('Error al cargar las empresas', 'error');
      }
    });
  }

  get filteredCompanies(): Company[] {
    const search = this.searchTerm().toLowerCase();
    if (!search) return this.companies();
    return this.companies().filter(c =>
      c.name.toLowerCase().includes(search) ||
      c.tax_id?.toLowerCase().includes(search) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase().includes(search)
    );
  }

  get pagedCompanies(): Company[] {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredCompanies.slice(start, start + this.pageSize);
  }

  get paginationConfig(): PaginationConfig {
    const total = this.filteredCompanies.length;
    return {
      currentPage: this.currentPage(),
      totalPages: Math.ceil(total / this.pageSize),
      totalItems: total,
      itemsPerPage: this.pageSize,
    };
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  openCreate(): void {
    this.formData.set({
      name: '',
      tax_id: '',
      address: '',
      phone: '',
      email: '',
      logo_path: '',
    });
    this.isCreateOpen.set(true);
  }

  closeCreate(): void {
    this.isCreateOpen.set(false);
  }

  openEdit(company: Company): void {
    this.selectedCompany.set(company);
    this.formData.set({
      name: company.name,
      tax_id: company.tax_id ?? '',
      address: company.address ?? '',
      phone: company.phone ?? '',
      email: company.email ?? '',
      logo_path: company.logo_path ?? '',
    });
    this.isEditOpen.set(true);
  }

  closeEdit(): void {
    this.isEditOpen.set(false);
    this.selectedCompany.set(null);
  }

  createCompany(): void {
    const data = this.formData();
    if (!data.name?.trim()) {
      this.showToast('El nombre de la empresa es obligatorio', 'error');
      return;
    }
    this.companyService.createCompany(data).subscribe({
      next: () => {
        this.showToast('Empresa creada exitosamente', 'success');
        this.closeCreate();
        this.loadCompanies();
      },
      error: () => this.showToast('Error al crear la empresa', 'error')
    });
  }

  updateCompany(): void {
    const data = this.formData();
    const id = this.selectedCompany()!.id;
    if (!data.name?.trim()) {
      this.showToast('El nombre de la empresa es obligatorio', 'error');
      return;
    }
    this.companyService.updateCompany(id, data).subscribe({
      next: () => {
        this.showToast('Empresa actualizada exitosamente', 'success');
        this.closeEdit();
        this.loadCompanies();
      },
      error: () => this.showToast('Error al actualizar la empresa', 'error')
    });
  }

  deleteCompany(company: Company): void {
    if (!confirm(`¿Está seguro de eliminar la empresa "${company.name}"?`)) return;
    this.companyService.deleteCompany(company.id).subscribe({
      next: () => {
        this.showToast('Empresa eliminada exitosamente', 'success');
        this.loadCompanies();
      },
      error: () => this.showToast('Error al eliminar la empresa', 'error')
    });
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES');
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }
}
