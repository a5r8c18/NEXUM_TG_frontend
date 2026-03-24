import { Component, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CompanyService } from '../../core/services/company.service';
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

  constructor() {
    // Pre-cargar empresas de demo para usuarios multi-empresa
    this.loadDemoCompanies();
  }

  goBack() {
    this.router.navigate(['/']);
  }

  private loadDemoCompanies(): void {
    // Cargar empresas de demo para que estén disponibles antes del login
    const mockCompanies: Company[] = [
      {
        id: 1,
        name: 'Empresa Principal S.A.',
        tax_id: '20123456789',
        address: 'Av. Principal 123',
        phone: '555-1234',
        email: 'contacto@principal.com',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        name: 'Sucursal Norte Ltda.',
        tax_id: '20987654321',
        address: 'Calle Norte 456',
        phone: '555-5678',
        email: 'info@norte.com',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 3,
        name: 'Filial Sur SAC',
        tax_id: '20543219876',
        address: 'Av. Sur 789',
        phone: '555-9012',
        email: 'sur@filial.com',
        is_active: true,
        created_at: new Date().toISOString()
      }
    ];
    
    this.availableCompanies.set(mockCompanies);
    this.selectedCompany.set(mockCompanies[0]);
  }

  isMultiCompanyUser(): boolean {
    // Detectar si el email corresponde a un usuario multi-empresa
    const email = this.email().toLowerCase();
    return email.includes('multi') || email.includes('admin') || email.includes('dev');
  }

  goToSignup() {
    this.router.navigate(['/signup']);
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
        const userTenant = this.authService.getCurrentUserTenant();
        
        if (userTenant?.type === 'MULTI_COMPANY') {
          // Para multi-empresa, ir directamente al dashboard con la empresa seleccionada
          await this.proceedToDashboard();
        } else {
          // Para SINGLE_COMPANY, ir directo al dashboard
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

  private async loadCompanies(): Promise<void> {
    try {
      // Simular carga de empresas para demo
      const mockCompanies: Company[] = [
        {
          id: 1,
          name: 'Empresa Principal S.A.',
          tax_id: '20123456789',
          address: 'Av. Principal 123',
          phone: '555-1234',
          email: 'contacto@principal.com',
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          name: 'Sucursal Norte Ltda.',
          tax_id: '20987654321',
          address: 'Calle Norte 456',
          phone: '555-5678',
          email: 'info@norte.com',
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: 3,
          name: 'Filial Sur SAC',
          tax_id: '20543219876',
          address: 'Av. Sur 789',
          phone: '555-9012',
          email: 'sur@filial.com',
          is_active: true,
          created_at: new Date().toISOString()
        }
      ];
      
      this.availableCompanies.set(mockCompanies);
      
      // Seleccionar la primera empresa por defecto
      if (mockCompanies.length > 0) {
        this.selectedCompany.set(mockCompanies[0]);
      }
    } catch (error) {
      console.error('Error loading companies:', error);
      this.errorMessage.set('Error al cargar las empresas disponibles.');
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

    // Si ya está logueado, ir directamente al dashboard
    if (this.authService.currentUser()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.isLoading.set(true);
    
    try {
      // Aquí iría la lógica para establecer el contexto de la empresa seleccionada
      // Por ahora, navegamos directamente al dashboard
      this.router.navigate(['/dashboard']);
    } catch (error) {
      this.errorMessage.set('Error al establecer la empresa seleccionada.');
    } finally {
      this.isLoading.set(false);
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.set(!this.showPassword());
  }

  onEmailChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.email.set(target.value);
    this.errorMessage.set(''); // Limpiar error al cambiar el email
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
