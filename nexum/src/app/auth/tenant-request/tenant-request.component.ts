import { Component, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TenantRequestService } from '../../core/services/tenant-request.service';
import { ThemeService } from '../../core/services/theme.service';
import { TenantRequest, TenantType } from '../../core/models/tenant-request.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-tenant-request',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tenant-request.component.html'
})
export class TenantRequestComponent {
  // Información Personal
  firstName = signal('');
  lastName = signal('');
  email = signal('');
  phone = signal('');
  position = signal('');
  
  // Información de la Empresa
  companyName = signal('');
  industry = signal('');
  country = signal('');
  website = signal('');
  
  // Tipo de Tenant
  selectedTenantType = signal<TenantType | null>(null);
  
  // Justificación
  useCase = signal('');
  message = signal('');
  referralSource = signal('');
  
  // Estado del formulario
  isLoading = signal(false);
  isSubmitted = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  
  private tenantRequestService = inject(TenantRequestService);
  private router = inject(Router);
  public themeService = inject(ThemeService);
  
  // Tipos de tenant disponibles
  tenantTypes = signal(this.tenantRequestService.getTenantTypes());
  
  constructor() {
    console.log(' TENANT REQUEST COMPONENT - Constructor ejecutado!');
    console.log(' TENANT REQUEST - Componente de solicitud de acceso cargado');
  }

  // Métodos para sincronizar con el tema del sidebar
  get backgroundThemeClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'bg-gradient-to-br from-slate-50 to-slate-100';
    } else {
      return 'bg-gradient-to-br from-slate-900 to-slate-800';
    }
  }

  get cardThemeClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'bg-white border border-slate-200';
    } else {
      return 'bg-white/10 backdrop-blur-md border border-slate-700';
    }
  }

  get textThemeClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'text-slate-900';
    } else {
      return 'text-white';
    }
  }

  get subTextThemeClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'text-slate-600';
    } else {
      return 'text-slate-400';
    }
  }

  get inputThemeClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
    } else {
      return 'bg-white/5 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
    }
  }

  get labelThemeClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'text-sm font-medium text-slate-700';
    } else {
      return 'text-sm font-medium text-slate-300';
    }
  }

  get buttonThemeClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'bg-blue-600 hover:bg-blue-700 text-white';
    } else {
      return 'bg-blue-500 hover:bg-blue-600 text-white';
    }
  }

  get backButtonThemeClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'text-slate-600 hover:text-slate-900';
    } else {
      return 'text-white/60 hover:text-white';
    }
  }
  
  goBack() {
    this.router.navigate(['/']);
  }
  
  selectTenantType(type: TenantType) {
    console.group('🔍 TENANT REQUEST - Tipo de tenant seleccionado');
    console.log('🏗️ Tipo seleccionado:', type);
    console.log('🆔 ID:', type.id);
    console.log('📝 Nombre:', type.name);
    console.log('📄 Descripción:', type.description);
    console.groupEnd();
    
    this.selectedTenantType.set(type);
    this.errorMessage.set('');
  }
  
  async onSubmit(): Promise<void> {
    console.log('🔥 TENANT REQUEST - Método onSubmit ejecutado!');
    
    // Validaciones
    if (!this.validateForm()) {
      console.log('❌ TENANT REQUEST - Validación fallida');
      return;
    }
    
    this.isLoading.set(true);
    this.errorMessage.set('');
    
    // Log datos del formulario
    const request: Omit<TenantRequest, 'id' | 'status' | 'requestedAt' | 'reviewedAt' | 'reviewedBy' | 'adminNotes' | 'rejectionReason'> = {
      firstName: this.firstName(),
      lastName: this.lastName(),
      email: this.email(),
      phone: this.phone(),
      position: this.position(),
      companyName: this.companyName(),
      industry: this.industry(),
      country: this.country(),
      website: this.website() || undefined,
      tenantType: this.selectedTenantType()!.id,
      useCase: this.useCase(),
      message: this.message(),
      referralSource: this.referralSource() || undefined
    };
    
    console.group('🔍 TENANT REQUEST - Datos enviados al backend');
    console.log('📤 Payload:', request);
    console.log('👤 Persona:', `${request.firstName} ${request.lastName}`);
    console.log('📧 Email:', request.email);
    console.log('📞 Teléfono:', request.phone);
    console.log('🏢 Empresa:', request.companyName);
    console.log('🏭 Industria:', request.industry);
    console.log('🌍 País:', request.country);
    console.log('🏗️ Tenant Type:', request.tenantType);
    console.log('📝 Caso de uso:', request.useCase);
    console.log('💬 Mensaje:', request.message);
    console.groupEnd();
    
    try {
      const result = await firstValueFrom(this.tenantRequestService.createRequest(request));
      
      console.group('🔍 TENANT REQUEST - Respuesta REAL del backend');
      console.log('✅ Solicitud guardada en PostgreSQL:', result);
      console.log('📊 Resultado:', result ? 'SOLICITUD CREADA EN BD' : 'FALLÓ GUARDADO');
      console.log('🆔 Request ID:', result?.email);
      console.log('📊 Status:', result?.status);
      console.log('📅 Fecha creación:', result?.requestedAt);
      console.groupEnd();
      
      if (result) {
        this.isSubmitted.set(true);
        this.successMessage.set('¡Solicitud enviada exitosamente! Te contactaremos pronto.');
      }
    } catch (error: any) {
      console.group('🔍 TENANT REQUEST - Error del backend');
      console.error('❌ Error en solicitud:', error);
      console.log('📄 Tipo de error:', error?.constructor?.name);
      console.log('📝 Mensaje:', error?.message || 'Sin mensaje');
      console.log('🔍 Status:', error?.status || 'N/A');
      console.log('📦 Error response:', error?.error || 'N/A');
      console.groupEnd();
      
      this.errorMessage.set('Error al enviar la solicitud. Intente nuevamente.');
    } finally {
      this.isLoading.set(false);
    }
  }
  
  private validateForm(): boolean {
    // Validar campos personales
    if (!this.firstName() || !this.lastName() || !this.email() || !this.phone()) {
      this.errorMessage.set('Por favor complete todos los campos personales');
      return false;
    }
    
    // Validar email
    if (!this.isValidEmail(this.email())) {
      this.errorMessage.set('Por favor ingrese un email válido');
      return false;
    }
    
    // Validar información de empresa
    if (!this.companyName() || !this.industry() || !this.country()) {
      this.errorMessage.set('Por favor complete toda la información de la empresa');
      return false;
    }
    
    // Validar tipo de tenant
    if (!this.selectedTenantType()) {
      this.errorMessage.set('Por favor seleccione el tipo de tenant que necesita');
      return false;
    }
    
    // Validar justificación
    if (!this.useCase() || !this.message()) {
      this.errorMessage.set('Por favor describa para qué necesita el sistema');
      return false;
    }
    
    return true;
  }
  
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  // Getters para validación en tiempo real
  get isFormValid(): boolean {
    return !!(this.firstName() && this.lastName() && this.email() && this.phone() &&
              this.companyName() && this.industry() && this.country() &&
              this.selectedTenantType() && this.useCase() && this.message());
  }
  
  // Limpiar mensajes al cambiar campos
  onFieldChange() {
    this.errorMessage.set('');
  }
}
