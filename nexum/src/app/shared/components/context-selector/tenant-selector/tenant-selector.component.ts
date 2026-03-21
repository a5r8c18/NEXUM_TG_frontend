import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ContextService } from '../../../../core/services/context.service';
import { TenantService } from '../../../../core/services/tenant.service';
import { Tenant } from '../../../../core/models/tenant.model';

@Component({
  selector: 'app-tenant-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tenant-selector.component.html'
})
export class TenantSelectorComponent {
  private contextService = inject(ContextService);
  private tenantService = inject(TenantService);
  private router = inject(Router);

  tenants = signal<Tenant[]>([]);
  isLoading = signal(false);
  hasError = signal(false);

  currentTenant = this.contextService.currentTenant;

  ngOnInit() {
    this.loadTenants();
  }

  loadTenants() {
    this.isLoading.set(true);
    this.hasError.set(false);

    // TODO: Implementar carga de tenants del usuario actual
    // Por ahora, datos de ejemplo
    setTimeout(() => {
      this.tenants.set([
        {
          id: 'tenant-1',
          name: 'Tenant Demo Multi-Empresa',
          domain: 'demo.nexum.com',
          isActive: true,
          type: 'MULTI_COMPANY',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          settings: {
            maxCompanies: 10,
            maxUsers: 100,
            features: ['inventory', 'billing', 'hr']
          }
        },
        {
          id: 'tenant-2',
          name: 'Tenant Demo Empresa Individual',
          domain: 'single.nexum.com',
          isActive: true,
          type: 'SINGLE_COMPANY',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          settings: {
            maxCompanies: 1,
            maxUsers: 20,
            features: ['inventory', 'billing']
          }
        }
      ]);
      this.isLoading.set(false);
    }, 1000);
  }

  selectTenant(tenant: Tenant) {
    this.contextService.setCurrentTenant(tenant);
    
    // Flujo adaptativo según tipo de tenant
    if (tenant.type === 'SINGLE_COMPANY') {
      // Para SINGLE_COMPANY, ir directo al dashboard (sin company selection)
      this.router.navigate(['/dashboard']);
    } else {
      // Para MULTI_COMPANY, ir a selección de company
      this.router.navigate(['/company-selection']);
    }
  }

  isActiveTenant(tenant: Tenant): boolean {
    return this.currentTenant()?.id === tenant.id;
  }
}