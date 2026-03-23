import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ContextService } from '../../../../core/services/context.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Company } from '../../../../core/models/company.model';
import { Tenant } from '../../../../core/models/tenant.model';

@Component({
  selector: 'app-company-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './company-selector.component.html'
})
export class CompanySelectorComponent {
  private contextService = inject(ContextService);
  private authService = inject(AuthService);
  private router = inject(Router);

  companies = signal<Company[]>([]);
  isLoading = signal(false);
  hasError = signal(false);
  showCreateModal = signal(false);
  showEditModal = signal(false);
  showDeleteConfirm = signal(false);
  editingCompany = signal<Company | null>(null);

  // Form fields
  formName = signal('');
  formTaxId = signal('');
  formPhone = signal('');
  formEmail = signal('');
  formAddress = signal('');
  formError = signal('');

  currentCompany = this.contextService.currentCompany;

  get userName(): string {
    return this.authService.getFullName();
  }

  get tenantName(): string {
    return this.authService.getCurrentUserTenant()?.name || 'NEXUM';
  }

  get isMultiCompany(): boolean {
    return this.authService.isMultiCompany();
  }

  ngOnInit() {
    // Asignar tenant automáticamente desde el usuario autenticado
    const userTenant = this.authService.getCurrentUserTenant();
    if (userTenant && !this.contextService.hasActiveTenant()) {
      this.contextService.setCurrentTenant({
        id: userTenant.id,
        name: userTenant.name,
        type: userTenant.type as 'MULTI_COMPANY' | 'SINGLE_COMPANY',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as Tenant);
    }
    this.loadCompanies();
  }

  loadCompanies() {
    this.isLoading.set(true);
    this.hasError.set(false);

    // TODO: Reemplazar con llamada real a GET /companies
    setTimeout(() => {
      this.companies.set([
        {
          id: 'comp-1',
          tenantId: 'tenant-multi-1',
          name: 'Comercial Andes S.A.',
          taxId: 'RUC-20100001',
          phone: '+593 2 256-7890',
          email: 'info@comercialandes.com',
          address: 'Av. Amazonas N34-56, Quito',
          isActive: true,
          createdAt: '2024-01-15T00:00:00Z',
          updatedAt: '2024-06-01T00:00:00Z'
        },
        {
          id: 'comp-2',
          tenantId: 'tenant-multi-1',
          name: 'Distribuidora Pacífico Ltda.',
          taxId: 'RUC-20100002',
          phone: '+593 4 230-1234',
          email: 'contacto@distpacifico.com',
          address: 'Malecón 2000, Guayaquil',
          isActive: true,
          createdAt: '2024-03-20T00:00:00Z',
          updatedAt: '2024-06-15T00:00:00Z'
        },
        {
          id: 'comp-3',
          tenantId: 'tenant-multi-1',
          name: 'Servicios Integrales del Sur',
          taxId: 'RUC-20100003',
          phone: '+593 7 284-5678',
          email: 'admin@serviciossur.com',
          address: 'Gran Colombia 12-40, Cuenca',
          isActive: true,
          createdAt: '2024-05-10T00:00:00Z',
          updatedAt: '2024-07-01T00:00:00Z'
        }
      ]);
      this.isLoading.set(false);
    }, 800);
  }

  selectCompany(company: Company) {
    this.contextService.setCurrentCompany(company);
    this.router.navigate(['/dashboard']);
  }

  isActiveCompany(company: Company): boolean {
    return this.currentCompany()?.id === company.id;
  }

  // CRUD Operations
  openCreateModal() {
    this.resetForm();
    this.showCreateModal.set(true);
  }

  openEditModal(company: Company, event: Event) {
    event.stopPropagation();
    this.editingCompany.set(company);
    this.formName.set(company.name);
    this.formTaxId.set(company.taxId);
    this.formPhone.set(company.phone || '');
    this.formEmail.set(company.email || '');
    this.formAddress.set(company.address || '');
    this.formError.set('');
    this.showEditModal.set(true);
  }

  openDeleteConfirm(company: Company, event: Event) {
    event.stopPropagation();
    this.editingCompany.set(company);
    this.showDeleteConfirm.set(true);
  }

  createCompany() {
    if (!this.formName() || !this.formTaxId()) {
      this.formError.set('Nombre y RUC/NIT son obligatorios');
      return;
    }
    const newCompany: Company = {
      id: 'comp-' + Date.now(),
      tenantId: this.authService.getCurrentUserTenant()?.id || '',
      name: this.formName(),
      taxId: this.formTaxId(),
      phone: this.formPhone() || undefined,
      email: this.formEmail() || undefined,
      address: this.formAddress() || undefined,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.companies.set([...this.companies(), newCompany]);
    this.closeModals();
  }

  updateCompany() {
    const editing = this.editingCompany();
    if (!editing || !this.formName() || !this.formTaxId()) {
      this.formError.set('Nombre y RUC/NIT son obligatorios');
      return;
    }
    const updated = this.companies().map(c =>
      c.id === editing.id
        ? { ...c, name: this.formName(), taxId: this.formTaxId(), phone: this.formPhone() || undefined, email: this.formEmail() || undefined, address: this.formAddress() || undefined, updatedAt: new Date().toISOString() }
        : c
    );
    this.companies.set(updated);
    this.closeModals();
  }

  deleteCompany() {
    const editing = this.editingCompany();
    if (!editing) return;
    this.companies.set(this.companies().filter(c => c.id !== editing.id));
    if (this.currentCompany()?.id === editing.id) {
      this.contextService.setCurrentCompany(null);
    }
    this.closeModals();
  }

  closeModals() {
    this.showCreateModal.set(false);
    this.showEditModal.set(false);
    this.showDeleteConfirm.set(false);
    this.editingCompany.set(null);
    this.resetForm();
  }

  private resetForm() {
    this.formName.set('');
    this.formTaxId.set('');
    this.formPhone.set('');
    this.formEmail.set('');
    this.formAddress.set('');
    this.formError.set('');
  }

  logout() {
    this.contextService.clearContext();
    this.authService.logout();
  }
}