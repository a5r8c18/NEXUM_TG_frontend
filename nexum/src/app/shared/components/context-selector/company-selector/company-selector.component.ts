import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ContextService } from '../../../../core/services/context.service';
import { CompanyService } from '../../../../core/services/company.service';
import { Company } from '../../../../core/models/company.model';

@Component({
  selector: 'app-company-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './company-selector.component.html'
})
export class CompanySelectorComponent {
  private contextService = inject(ContextService);
  private companyService = inject(CompanyService);
  private router = inject(Router);

  companies = signal<Company[]>([]);
  isLoading = signal(false);
  hasError = signal(false);

  currentCompany = this.contextService.currentCompany;

  ngOnInit() {
    this.loadCompanies();
  }

  loadCompanies() {
    this.isLoading.set(true);
    this.hasError.set(false);

    // TODO: Implementar carga de compañías del tenant actual
    // Por ahora, datos de ejemplo
    setTimeout(() => {
      this.companies.set([
        {
          id: '1',
          tenantId: 'tenant-1',
          name: 'Empresa Demo S.A.',
          taxId: '123456789',
          phone: '+1234567890',
          email: 'info@empresa-demo.com',
          address: 'Dirección de ejemplo',
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ]);
      this.isLoading.set(false);
    }, 1000);
  }

  selectCompany(company: Company) {
    this.contextService.setCurrentCompany(company);
    // Redirigir automáticamente al dashboard
    this.router.navigate(['/dashboard']);
  }

  isActiveCompany(company: Company): boolean {
    return this.currentCompany()?.id === company.id;
  }
}