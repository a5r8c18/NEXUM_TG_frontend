import { Component, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TenantRequestService } from '../../core/services/tenant-request.service';
import { TenantRequest, TenantType } from '../../core/models/tenant-request.model';

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
  
  // Tipos de tenant disponibles
  tenantTypes = signal(this.tenantRequestService.getTenantTypes());
  
  constructor() {}
  
  goBack() {
    this.router.navigate(['/']);
  }
  
  selectTenantType(type: TenantType) {
    this.selectedTenantType.set(type);
    this.errorMessage.set('');
  }
  
  async onSubmit(): Promise<void> {
    // Validaciones
    if (!this.validateForm()) {
      return;
    }
    
    this.isLoading.set(true);
    this.errorMessage.set('');
    
    try {
      const request: Omit<TenantRequest, 'status' | 'requestedAt' | 'reviewedAt' | 'reviewedBy' | 'adminNotes' | 'rejectionReason'> = {
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
      
      const result = await this.tenantRequestService.createRequest(request);
      
      if (result) {
        this.isSubmitted.set(true);
        this.successMessage.set('¡Solicitud enviada exitosamente! Te contactaremos pronto.');
      }
    } catch (error) {
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
