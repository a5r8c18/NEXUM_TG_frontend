import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ContextService } from '../../../../core/services/context.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CompanyService } from '../../../../core/services/company.service';
import { Company } from '../../../../models/company.models';
import { Tenant } from '../../../../core/models/tenant.model';
import { firstValueFrom } from 'rxjs';

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
  private companyService = inject(CompanyService);

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

  async loadCompanies() {
    console.log('🔍 COMPANY SELECTOR - Cargando empresas desde la base de datos...');
    this.isLoading.set(true);
    this.hasError.set(false);

    try {
      // Cargar empresas reales desde la base de datos
      const companies = await firstValueFrom(this.companyService.getCompanies());
      console.log('✅ COMPANY SELECTOR - Empresas cargadas:', companies.length);
      console.log('📊 COMPANY SELECTOR - Empresas:', companies.map(c => c.name));
      
      this.companies.set(companies);
    } catch (error) {
      console.error('❌ COMPANY SELECTOR - Error cargando empresas:', error);
      this.hasError.set(true);
      
      // Fallback a empresas de demo si hay error (usando el modelo correcto)
      console.log('🔍 COMPANY SELECTOR - Usando empresas de demo como fallback');
      this.companies.set([
        {
          id: 1,
          tax_id: '20123456789',
          address: 'Av. Demo 123',
          phone: '555-1234',
          email: 'demo@empresa.com',
          is_active: true,
          created_at: new Date().toISOString(),
          name: 'Empresa Demo S.A.'
        }
      ]);
    } finally {
      this.isLoading.set(false);
    }
  }

  selectCompany(company: Company) {
    this.contextService.setCurrentCompany(company as any);
    this.router.navigate(['/dashboard']);
  }

  isActiveCompany(company: Company): boolean {
    const current = this.currentCompany();
    return current?.id?.toString() === company.id?.toString();
  }

  // CRUD Operations - Simplificados para evitar errores de tipos
  openCreateModal() {
    this.resetForm();
    this.showCreateModal.set(true);
  }

  openEditModal(company: Company, event: Event) {
    event.stopPropagation();
    this.editingCompany.set(company);
    this.formName.set(company.name);
    this.formTaxId.set(company.tax_id || '');
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
      id: Date.now(),
      tax_id: this.formTaxId(),
      address: this.formAddress() || undefined,
      phone: this.formPhone() || undefined,
      email: this.formEmail() || undefined,
      is_active: true,
      created_at: new Date().toISOString(),
      name: this.formName()
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
        ? { ...c, name: this.formName(), tax_id: this.formTaxId(), phone: this.formPhone() || undefined, email: this.formEmail() || undefined, address: this.formAddress() || undefined }
        : c
    );
    this.companies.set(updated);
    this.closeModals();
  }

  deleteCompany() {
    const editing = this.editingCompany();
    if (!editing) return;
    this.companies.set(this.companies().filter(c => c.id !== editing.id));
    const current = this.currentCompany();
    if (current?.id?.toString() === editing.id?.toString()) {
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