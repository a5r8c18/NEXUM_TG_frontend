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
    // Check for token in query params
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        this.registrationToken.set(token);
        this.validateToken(token);
      } else {
        // No token: allow open registration (for demo)
        this.tokenValid.set(true);
      }
    });
  }

  async validateToken(token: string): Promise<void> {
    this.tokenChecking.set(true);
    try {
      const result = await this.authService.validateRegistrationToken(token);
      this.tokenValid.set(result.valid);
      if (result.valid && result.email) {
        this.email.set(result.email);
        this.tenantType.set(result.tenantType || '');
      }
    } catch {
      this.tokenValid.set(false);
    } finally {
      this.tokenChecking.set(false);
    }
  }

  async onSignup(): Promise<void> {
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
    
    try {
      // Simulación de registro
      const success = await this.authService.signup({
        firstName: this.firstName(),
        lastName: this.lastName(),
        email: this.email(),
        password: this.password()
      });
      
      if (success) {
        this.successMessage.set('¡Cuenta creada exitosamente! Redirigiendo al login...');
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      } else {
        this.errorMessage.set('El email ya está registrado. Intente con otro email.');
      }
    } catch (error) {
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
