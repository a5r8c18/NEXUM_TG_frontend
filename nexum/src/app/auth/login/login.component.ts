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
      console.log('🔍 LOGIN - Cargando empresas para usuario:', email);
      
      // Extraer el apellido del email para buscar empresas
      const emailParts = email.split('@')[0].split('.');
      const lastName = emailParts.length > 1 ? emailParts[emailParts.length - 1] : '';
      const firstName = emailParts[0];
      
      console.log('🔍 LOGIN - Buscando empresas para:', firstName, lastName);
      
      let companies: Company[] = [];
      
      // Estrategia 1: Buscar por apellido (ej: "Garcia" de "developer@gmail.com")
      if (lastName) {
        try {
          console.log('🔍 LOGIN - Buscando empresas por apellido:', lastName);
          companies = await firstValueFrom(this.companyService.getCompaniesByName(lastName));
          console.log('🔍 LOGIN - Empresas encontradas por apellido:', companies.length);
          
          if (companies.length > 0) {
            console.log('🔍 LOGIN - Empresa encontrada por apellido:', companies[0].name);
          }
        } catch (error) {
          console.log('🔍 LOGIN - Error buscando por apellido');
        }
      }
      
      // Estrategia 2: Buscar por nombre completo si no se encontró por apellido
      if (companies.length === 0) {
        try {
          console.log('🔍 LOGIN - Buscando empresas por nombre completo:', firstName);
          companies = await firstValueFrom(this.companyService.getCompaniesByName(firstName));
          console.log('🔍 LOGIN - Empresas encontradas por nombre:', companies.length);
        } catch (error) {
          console.log('🔍 LOGIN - Error buscando por nombre');
        }
      }
      
      // Estrategia 3: Fallback a todas las empresas
      if (companies.length === 0) {
        console.log('🔍 LOGIN - Cargando todas las empresas como fallback');
        companies = await firstValueFrom(this.companyService.getCompanies());
      }
      
      console.log('🔍 LOGIN - Empresas finales obtenidas:', companies);
      
      this.availableCompanies.set(companies);
      
      // Seleccionar la primera empresa por defecto
      if (companies.length > 0) {
        this.selectedCompany.set(companies[0]);
        console.log('🔍 LOGIN - Empresa seleccionada por defecto:', companies[0].name);
      }
    } catch (error) {
      console.error('Error loading companies:', error);
      console.log('🔍 LOGIN - Error al cargar empresas, usando fallback');
      
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
    // Detectar si el email corresponde a un usuario multi-empresa
    const email = this.email().toLowerCase();
    return email.includes('multi') || email.includes('admin') || email.includes('dev');
  }

  goToSignup() {
    this.router.navigate(['/tenant-request']);
  }

  async onLogin(): Promise<void> {
    console.log('🔥 LOGIN - Método onLogin ejecutado!');
    console.log('📊 Datos de login:', {
      email: this.email(),
      password: this.password() ? '***' : null,
      selectedCompany: this.selectedCompany()?.name || null,
      isMultiCompany: this.isMultiCompanyUser()
    });

    if (!this.email() || !this.password()) {
      console.log('❌ LOGIN - Email o contraseña vacíos');
      this.errorMessage.set('Por favor ingrese email y contraseña');
      return;
    }

    // Para usuarios multi-empresa, verificar que hayan seleccionado empresa
    if (this.isMultiCompanyUser() && !this.selectedCompany()) {
      console.log('❌ LOGIN - Usuario multi-empresa sin seleccionar empresa');
      this.errorMessage.set('Por favor seleccione una empresa.');
      return;
    }

    console.log('✅ LOGIN - Validaciones pasadas, iniciando login...');
    this.isLoading.set(true);
    this.errorMessage.set('');
    
    try {
      console.log('🔍 LOGIN - Llamando a authService.login()...');
      const success = await this.authService.login(this.email(), this.password());
      console.log('🔍 LOGIN - Resultado de authService.login():', success);
      
      if (success) {
        console.log('✅ LOGIN - Login exitoso!');
        const userTenant = this.authService.getCurrentUserTenant();
        console.log('🔍 LOGIN - Tenant del usuario:', userTenant);
        
        if (userTenant?.type === 'MULTI_COMPANY') {
          console.log('🔍 LOGIN - Usuario multi-empresa, yendo al dashboard...');
          // Para multi-empresa, ir directamente al dashboard con la empresa seleccionada
          await this.proceedToDashboard();
        } else {
          console.log('🔍 LOGIN - Usuario single-company, yendo al dashboard...');
          // Para SINGLE_COMPANY, ir directo al dashboard
          this.router.navigate(['/dashboard']);
        }
      } else {
        console.log('❌ LOGIN - Login falló: credenciales incorrectas');
        this.errorMessage.set('Credenciales incorrectas. Intente nuevamente.');
      }
    } catch (error) {
      console.log('❌ LOGIN - Error en login:', error);
      this.errorMessage.set('Error al iniciar sesión. Intente nuevamente.');
    } finally {
      console.log('🔥 LOGIN - Finally block ejecutado');
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
    console.log('🔥 PROCEED TO DASHBOARD - Método ejecutado!');
    console.log('📊 Empresa seleccionada:', this.selectedCompany()?.name || 'null');
    console.log('👤 Usuario actual:', this.authService.currentUser() ? 'autenticado' : 'no autenticado');
    
    if (!this.selectedCompany()) {
      console.log('❌ PROCEED TO DASHBOARD - Sin empresa seleccionada');
      this.errorMessage.set('Por favor seleccione una empresa.');
      return;
    }

    // Si ya está logueado, ir directamente al dashboard
    if (this.authService.currentUser()) {
      console.log('✅ PROCEED TO DASHBOARD - Usuario ya autenticado, estableciendo empresa...');
      
      // Establecer la empresa seleccionada en el ContextService
      if (this.selectedCompany()) {
        console.log('🔍 PROCEED TO DASHBOARD - Estableciendo empresa en ContextService:', this.selectedCompany()?.name);
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
        
        console.log('✅ PROCEED TO DASHBOARD - Empresa establecida, yendo al dashboard');
      }
      
      this.router.navigate(['/dashboard']);
      return;
    }

    console.log('🔍 PROCEED TO DASHBOARD - Usuario no autenticado, iniciando login...');
    this.isLoading.set(true);
    
    try {
      // Llamar a onLogin para autenticar al usuario
      console.log('🔍 PROCEED TO DASHBOARD - Llamando a onLogin()...');
      await this.onLogin();
      
      console.log('✅ PROCEED TO DASHBOARD - Login completado, yendo al dashboard');
      this.router.navigate(['/dashboard']);
    } catch (error) {
      console.log('❌ PROCEED TO DASHBOARD - Error:', error);
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
      console.log('🔍 LOGIN - Email multi-empresa detectado, cargando empresas...');
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
