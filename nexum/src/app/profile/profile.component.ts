import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { ContextService } from '../core/services/context.service';
import { UsersService } from '../core/services/users.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html'
})
export class ProfileComponent {
  private authService = inject(AuthService);
  private contextService = inject(ContextService);
  private usersService = inject(UsersService);
  private router = inject(Router);

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  showPasswords = signal(false);
  isSaving = signal(false);
  passwordMessage = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  get user() {
    return this.authService.currentUser();
  }

  get companyName(): string {
    return this.contextService.currentCompany()?.name || '—';
  }

  get userInitials(): string {
    const user = this.user;
    if (!user?.firstName || !user?.lastName) return 'U';
    return (user.firstName.charAt(0) + user.lastName.charAt(0)).toUpperCase();
  }

  get roleLabel(): string {
    switch (this.user?.role) {
      case 'superadmin': return 'Super Administrador';
      case 'admin': return 'Administrador';
      case 'user': return 'Usuario';
      case 'facturador': return 'Facturador';
      default: return this.user?.role || '—';
    }
  }

  changePassword(): void {
    this.passwordMessage.set(null);

    if (this.newPassword !== this.confirmPassword) {
      this.passwordMessage.set({ type: 'error', text: 'Las contraseñas nuevas no coinciden' });
      return;
    }
    if (this.newPassword.length < 6) {
      this.passwordMessage.set({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    this.isSaving.set(true);
    this.usersService.changeOwnPassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.passwordMessage.set({ type: 'success', text: 'Contraseña actualizada correctamente' });
      },
      error: (err) => {
        this.isSaving.set(false);
        this.passwordMessage.set({
          type: 'error',
          text: err?.error?.message || 'Error al cambiar la contraseña',
        });
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
