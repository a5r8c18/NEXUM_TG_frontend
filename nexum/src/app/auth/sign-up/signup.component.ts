import { Component, signal, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [],
  templateUrl: './signup.component.html'
})
export class SignupComponent {
  firstName = signal('');
  lastName = signal('');
  email = signal('');
  password = signal('');
  confirmPassword = signal('');
  isLoading = signal(false);
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  acceptTerms = signal(false);
  currentYear = signal(new Date().getFullYear());
  errorMessage = signal('');
  successMessage = signal('');

  // Token-based registration
  registrationToken = signal('');
  tokenValid = signal<boolean | null>(null);
  tokenChecking = signal(false);
  tenantType = signal('');

  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  constructor() {
    console.log('🔥 SIGNUP COMPONENT - Constructor ejecutado!');
    console.group('🔍 SIGNUP COMPONENT - Inicialización');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('🌐 URL actual:', window.location.href);
    console.log('📄 Query params disponibles:', window.location.search);
    console.groupEnd();
    
    // Check for token in query params
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      console.log('🔥 SIGNUP - Query params recibidos:', params);
      console.group('🔍 SIGNUP COMPONENT - Query Params procesados');
      console.log('📦 Todos los params:', params);
      console.log('🆔 Token encontrado:', !!token);
      console.log('🔤 Token valor:', token ? token.substring(0, 20) + '...' : 'N/A');
      console.groupEnd();
      
      if (token) {
        this.registrationToken.set(token);
        this.validateToken(token);
      } else {
        // No token: allow open registration (for demo)
        console.log('🔍 SIGNUP - Sin token, permitiendo registro abierto (demo)');
        this.tokenValid.set(true);
      }
    });
  }

  async validateToken(token: string): Promise<void> {
    this.tokenChecking.set(true);
    
    console.group('🔍 TOKEN VALIDATION - Validando token de registro');
    console.log('🆔 Token:', token);
    console.log('📅 Timestamp:', new Date().toISOString());
    console.groupEnd();
    
    try {
      const result = await this.authService.validateRegistrationToken(token);
      
      console.group('🔍 TOKEN VALIDATION - Respuesta del backend');
      console.log('✅ Token válido:', result.valid);
      console.log('📧 Email del token:', result.email);
      console.log('🏢 Tenant type:', result.tenantType);
      console.groupEnd();
      
      this.tokenValid.set(result.valid);
      if (result.valid && result.email) {
        this.email.set(result.email);
        this.tenantType.set(result.tenantType || '');
      }
    } catch (error: any) {
      console.group('🔍 TOKEN VALIDATION - Error');
      console.error('❌ Error validando token:', error);
      console.log('📄 Tipo de error:', error?.constructor?.name);
      console.log('📝 Mensaje:', error?.message || 'Sin mensaje');
      console.log('🔍 Status:', error?.status || 'N/A');
      console.groupEnd();
      
      this.tokenValid.set(false);
    } finally {
      this.tokenChecking.set(false);
    }
  }

  async onSignup(): Promise<void> {
    console.log('🔥 SIGNUP - Método onSignup ejecutado!');
    
    // Limpiar mensajes anteriores
    this.errorMessage.set('');
    this.successMessage.set('');

    // Validaciones
    if (!this.firstName() || !this.lastName() || !this.email() || !this.password() || !this.confirmPassword()) {
      this.errorMessage.set('Por favor complete todos los campos');
      return;
    }

    if (this.password() !== this.confirmPassword()) {
      this.errorMessage.set('Las contraseñas no coinciden');
      return;
    }

    if (this.password().length < 6) {
      this.errorMessage.set('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (!this.acceptTerms()) {
      this.errorMessage.set('Debe aceptar los términos y condiciones');
      return;
    }

    this.isLoading.set(true);
    
    // Log datos enviados al backend
    const signupData = {
      firstName: this.firstName(),
      lastName: this.lastName(),
      email: this.email(),
      password: this.password(),
      token: this.registrationToken() || undefined
    };
    
    console.group('🔍 SIGNUP - Datos enviados al backend');
    console.log('📤 Payload:', signupData);
    console.log('🆔 Token presente:', !!this.registrationToken());
    console.log('📧 Email:', this.email());
    console.log('👤 Nombre completo:', `${this.firstName()} ${this.lastName()}`);
    console.log('🔐 Contraseña (longitud):', this.password().length);
    console.log('✅ Términos aceptados:', this.acceptTerms());
    console.groupEnd();
    
    try {
      // Simulación de registro
      const success = await this.authService.signup(signupData);
      
      console.group('🔍 SIGNUP - Respuesta del backend');
      console.log('✅ Registro exitoso:', success);
      console.log('📊 Resultado:', success ? 'USUARIO CREADO' : 'FALLÓ REGISTRO');
      console.groupEnd();
      
      if (success) {
        this.successMessage.set('¡Cuenta creada exitosamente! Redirigiendo al login...');
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      } else {
        this.errorMessage.set('El email ya está registrado. Intente con otro email.');
      }
    } catch (error: any) {
      console.group('🔍 SIGNUP - Error del backend');
      console.error('❌ Error en registro:', error);
      console.log('📄 Tipo de error:', error?.constructor?.name);
      console.log('📝 Mensaje:', error?.message || 'Sin mensaje');
      console.log('🔍 Status:', error?.status || 'N/A');
      console.log('📦 Error response:', error?.error || 'N/A');
      console.groupEnd();
      
      this.errorMessage.set('Error al crear la cuenta. Intente nuevamente.');
    } finally {
      this.isLoading.set(false);
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.set(!this.showPassword());
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.set(!this.showConfirmPassword());
  }

  onFirstNameChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.firstName.set(target.value);
    this.errorMessage.set('');
  }

  onLastNameChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.lastName.set(target.value);
    this.errorMessage.set('');
  }

  onEmailChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.email.set(target.value);
    this.errorMessage.set('');
  }

  onPasswordChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.password.set(target.value);
    this.errorMessage.set('');
  }

  onConfirmPasswordChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.confirmPassword.set(target.value);
    this.errorMessage.set('');
  }

  onTermsChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.acceptTerms.set(target.checked);
    this.errorMessage.set('');
  }

  goBack() {
    this.router.navigate(['/']);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
