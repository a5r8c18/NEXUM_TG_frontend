import { Component, signal, inject, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ContextService } from '../../core/services/context.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [],
  templateUrl: './header.component.html'
})
export class HeaderComponent {
  private authService = inject(AuthService);
  private contextService = inject(ContextService);
  private router = inject(Router);

  showUserMenu = signal(false);

  get pageTitle(): string {
    const company = this.contextService.currentCompany();
    return company?.name || 'Panel de Control';
  }

  get userName(): string {
    return this.authService.getFullName() || 'Usuario';
  }

  get userEmail(): string {
    return this.authService.currentUser()?.email || '';
  }

  get userRole(): string {
    const role = this.authService.currentUser()?.role;
    switch (role) {
      case 'superadmin': return 'Super Administrador';
      case 'admin': return 'Administrador';
      case 'user': return 'Usuario';
      default: return 'Usuario';
    }
  }

  get companyName(): string {
    return this.contextService.currentCompany()?.name || '';
  }

  get isMultiCompany(): boolean {
    return this.authService.isMultiCompany();
  }

  get userInitials(): string {
    const user = this.authService.currentUser();
    if (!user) return 'U';
    return (user.firstName.charAt(0) + user.lastName.charAt(0)).toUpperCase();
  }

  toggleUserMenu(): void {
    this.showUserMenu.set(!this.showUserMenu());
  }

  switchCompany(): void {
    this.showUserMenu.set(false);
    this.router.navigate(['/company-selection']);
  }

  logout(): void {
    this.showUserMenu.set(false);
    this.contextService.clearContext();
    this.authService.logout();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-container')) {
      this.showUserMenu.set(false);
    }
  }
}