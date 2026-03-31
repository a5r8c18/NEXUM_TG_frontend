import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-setup-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './setup-password.component.html',
})
export class SetupPasswordComponent {
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  
  setupForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
  ) {
    this.setupForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      firstName: [''],
      lastName: [''],
    }, {
      validators: this.passwordMatchValidator,
    });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    
    if (password !== confirmPassword) {
      form.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  async onSubmit() {
    if (this.setupForm.invalid) {
      this.setupForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    try {
      const { confirmPassword, ...setupData } = this.setupForm.value;
      
      const response = await this.http.post<any>(
        `${environment.apiUrl}/auth/setup-password`,
        setupData
      ).toPromise();

      if (response) {
        this.success.set(response.message || 'Contraseña establecida exitosamente');
        
        // Redirigir al login después de 2 segundos
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error setting up password:', error);
      this.error.set(error?.error?.message || 'Error al establecer la contraseña');
    } finally {
      this.loading.set(false);
    }
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }
}
