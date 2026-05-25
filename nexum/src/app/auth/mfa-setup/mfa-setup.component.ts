import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MfaService, MFASetupResponse } from '../../core/services/mfa.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-mfa-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mfa-setup.component.html',
  styleUrls: ['./mfa-setup.component.scss'],
})
export class MfaSetupComponent {
  private mfaService = inject(MfaService);
  private authService = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  error = signal('');
  success = signal(false);

  setupData = signal<MFASetupResponse | null>(null);
  token = signal('');
  password = signal('');

  constructor() {
    this.loadSetupData();
  }

  loadSetupData() {
    this.loading.set(true);
    this.error.set('');

    this.mfaService.setupMFA().subscribe({
      next: (data) => {
        this.setupData.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Error al generar configuración MFA: ' + (err.message || 'Error desconocido'));
        this.loading.set(false);
      },
    });
  }

  verifyAndEnable() {
    if (!this.token() || this.token().length !== 6) {
      this.error.set('Ingrese el código de 6 dígitos');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.mfaService.verifyMFA(this.token()).subscribe({
      next: (response) => {
        if (response.success) {
          this.success.set(true);
          this.loading.set(false);
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 2000);
        } else {
          this.error.set(response.message || 'Código inválido');
          this.loading.set(false);
        }
      },
      error: (err) => {
        this.error.set('Error al verificar código: ' + (err.message || 'Error desconocido'));
        this.loading.set(false);
      },
    });
  }

  disableMFA() {
    if (!this.password()) {
      this.error.set('Ingrese su contraseña para deshabilitar MFA');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.mfaService.disableMFA(this.password()).subscribe({
      next: () => {
        this.success.set(true);
        this.loading.set(false);
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 2000);
      },
      error: (err) => {
        this.error.set('Error al deshabilitar MFA: ' + (err.message || 'Error desconocido'));
        this.loading.set(false);
      },
    });
  }

  cancel() {
    this.router.navigate(['/dashboard']);
  }

  copyBackupCodes() {
    const codes = this.setupData()?.backupCodes?.join('\n') || '';
    navigator.clipboard.writeText(codes).then(() => {
      alert('Códigos de respaldo copiados al portapapeles');
    });
  }
}
