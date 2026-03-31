import { Component, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { CompanyService } from '../../core/services/company.service';
import { ContextService } from '../../core/services/context.service';
import { Company } from '../../models/company.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  email = signal('');
  password = signal('');
  isLoading = signal(false);
  showPassword = signal(false);
  rememberMe = signal(false);
  currentYear = signal(new Date().getFullYear());
  errorMessage = signal('');
  selectedCompany = signal<Company | null>(null);
  availableCompanies = signal<Company[]>([]);
  showCompanyDropdown = signal(false);

  private authService = inject(AuthService);
  private router = inject(Router);
  private companyService = inject(CompanyService);
  private contextService = inject(ContextService);

  constructor() {
    // No cargar empresas de demo por defecto
    // Las empresas se cargarán cuando el usuario escriba su email
  }

  goBack() {
    this.router.navigate(['/']);
  }

  private async loadCompaniesForUser(email: string): Promise<void> {
    try {
      // Extraer el apellido del email para buscar empresas
      const emailParts = email.split('@')[0].split('.');
      const lastName = emailParts.length > 1 ? emailParts[emailParts.length - 1] : '';
      const firstName = emailParts[0];
      
      let companies: Company[] = [];
      
      // Estrategia 1: Buscar por apellido (ej: "Garcia" de "developer@gmail.com")
      if (lastName) {
        try {
          companies = await firstValueFrom(this.companyService.getCompaniesByName(lastName));
          
          if (companies.length > 0) {
            // Empresa encontrada por apellido
          }
        } catch (error) {
          // Error buscando por apellido
        }
      }
      
      // Estrategia 2: Buscar por nombre completo si no se encontró por apellido
      if (companies.length === 0) {
        try {
          companies = await firstValueFrom(this.companyService.getCompaniesByName(firstName));
        } catch (error) {
          // Error buscando por nombre
        }
      }
      
      // Estrategia 3: Fallback a todas las empresas
      if (companies.length === 0) {
        companies = await firstValueFrom(this.companyService.getCompanies());
      }
      
      this.availableCompanies.set(companies);
      
      // Seleccionar la primera empresa por defecto
      if (companies.length > 0) {
        this.selectedCompany.set(companies[0]);
      }
    } catch (error) {
      // Fallback a empresas de demo si hay error
      const fallbackCompanies: Company[] = [
        {
          id: 1,
          name: 'Empresa Demo S.A.',
          tax_id: '20123456789',
          address: 'Av. Demo 123',
          phone: '555-1234',
          email: 'demo@empresa.com',
          is_active: true,
          created_at: new Date().toISOString()
        }
      ];
      
      this.availableCompanies.set(fallbackCompanies);
      this.selectedCompany.set(fallbackCompanies[0]);
    }
  }

  isMultiCompanyUser(): boolean {
    // Después del login, verificar el tenantType real del usuario
    const user = this.authService.currentUser();
    if (user) {
      return user.tenantType === 'MULTI_COMPANY';
    }
    return false;
  }

  goToSignup() {
    this.router.navigate(['/tenant-request']);
  }

  logSubmitClick(): void {
    // Submit button clicked
  }

  async onLogin(): Promise<void> {
    if (!this.email() || !this.password()) {
      this.errorMessage.set('Por favor ingrese email y contraseña');
      return;
    }

    // Para usuarios multi-empresa, verificar que hayan seleccionado empresa
    if (this.isMultiCompanyUser() && !this.selectedCompany()) {
      this.errorMessage.set('Por favor seleccione una empresa.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    
    try {
      const success = await this.authService.login(this.email(), this.password());
      
      if (success) {
        const currentUser = this.authService.currentUser();
        
        // Superadmin va directo a solicitudes
        if (currentUser?.role === 'superadmin') {
          await this.router.navigate(['/admin/tenant-requests']);
          return;
        }
        
        const userTenant = this.authService.getCurrentUserTenant();
        
        if (userTenant?.type === 'MULTI_COMPANY') {
          await this.proceedToDashboard();
        } else {
          this.router.navigate(['/dashboard']);
        }
      } else {
        this.errorMessage.set('Credenciales incorrectas. Intente nuevamente.');
      }
    } catch (error) {
      this.errorMessage.set('Error al iniciar sesión. Intente nuevamente.');
    } finally {
      this.isLoading.set(false);
    }
  }

  toggleCompanyDropdown(): void {
    this.showCompanyDropdown.set(!this.showCompanyDropdown());
  }

  selectCompany(company: Company): void {
    this.selectedCompany.set(company);
    this.showCompanyDropdown.set(false);
  }

  async proceedToDashboard(): Promise<void> {
    if (!this.selectedCompany()) {
      this.errorMessage.set('Por favor seleccione una empresa.');
      return;
    }

    // Si ya está logueado, ir directamente al dashboard o admin/requests
    if (this.authService.currentUser()) {
      
      // Establecer la empresa seleccionada en el ContextService
      if (this.selectedCompany()) {
        this.contextService.setCurrentCompany({
          id: this.selectedCompany()!.id.toString(),
          name: this.selectedCompany()!.name,
          tax_id: this.selectedCompany()!.tax_id || '',
          address: this.selectedCompany()!.address || '',
          phone: this.selectedCompany()!.phone || '',
          email: this.selectedCompany()!.email || '',
          is_active: this.selectedCompany()!.is_active,
          created_at: this.selectedCompany()!.created_at
        } as any);
      }
      
      // Superadmin va a solicitudes
      if (this.authService.currentUser()?.role === 'superadmin') {
        this.router.navigate(['/admin/tenant-requests']);
        return;
      }
      
      this.router.navigate(['/dashboard']);
      return;
    }

    this.isLoading.set(true);
    
    try {
      await this.onLogin();
      
      if (this.authService.currentUser()?.role === 'superadmin') {
        this.router.navigate(['/admin/tenant-requests']);
        return;
      }
      
      this.router.navigate(['/dashboard']);
    } catch (error) {
      this.errorMessage.set('Error al iniciar sesión.');
    } finally {
      this.isLoading.set(false);
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.set(!this.showPassword());
  }

  onEmailChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const email = target.value;
    this.email.set(email);
    this.errorMessage.set(''); // Limpiar error al cambiar el email
    
    // Cargar empresas si el email parece ser de un usuario multi-empresa
    if (email && this.isMultiCompanyUser()) {
      this.loadCompaniesForUser(email);
    }
  }

  onPasswordChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.password.set(target.value);
    this.errorMessage.set(''); // Limpiar error al cambiar la contraseña
  }

  onRememberMeChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.rememberMe.set(target.checked);
  }
}
