import { Component, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/auth.service';

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

  private authService = inject(AuthService);
  private router = inject(Router);

  constructor() {}

  async onLogin(): Promise<void> {
    if (!this.email() || !this.password()) {
      this.errorMessage.set('Por favor ingrese email y contraseña');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    
    try {
      const success = await this.authService.login(this.email(), this.password());
      
      if (success) {
        // Redirigir al dashboard después del login exitoso
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage.set('Credenciales incorrectas. Intente nuevamente.');
      }
    } catch (error) {
      this.errorMessage.set('Error al iniciar sesión. Intente nuevamente.');
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
