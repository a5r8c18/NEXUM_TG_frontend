import { Component, signal, inject, HostListener, OnInit, OnDestroy, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ContextService } from '../../core/services/context.service';
import { CompanyService } from '../../core/services/company.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { Company } from '../../models/company.models';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './header.component.html'
})
export class HeaderComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private contextService = inject(ContextService);
  private router = inject(Router);
  private companyService = inject(CompanyService);
  wsService = inject(WebSocketService);

  showUserMenu = signal(false);
  showNotifications = signal(false);
  showCompanyDropdown = signal(false);
  companies = signal<Company[]>([]);
  isLoadingCompanies = signal(false);

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

  shouldShowCompanySelector = computed(() => {
    return this.isMultiCompany;
  });

  shouldShowSwitchCompanyOption = computed(() => {
    return this.isMultiCompany;
  });

  get userInitials(): string {
    const user = this.authService.currentUser();
    if (!user || !user.firstName || !user.lastName) return 'U';
    return (user.firstName.charAt(0) + user.lastName.charAt(0)).toUpperCase();
  }

  ngOnInit(): void {
    this.wsService.connect();
    if (this.isMultiCompany) {
      this.loadCompanies();
    }
  }

  ngOnDestroy(): void {
    this.wsService.disconnect();
  }

  async loadCompanies(): Promise<void> {
    if (!this.isMultiCompany) return;
    
    this.isLoadingCompanies.set(true);
    try {
      const companies = await firstValueFrom(this.companyService.getCompanies());
      this.companies.set(companies);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      this.isLoadingCompanies.set(false);
    }
  }

  toggleCompanyDropdown(): void {
    this.showCompanyDropdown.set(!this.showCompanyDropdown());
    // Cerrar otros menús al abrir dropdown de empresas
    if (this.showCompanyDropdown()) {
      this.showUserMenu.set(false);
      this.showNotifications.set(false);
    }
  }

  selectCompany(company: Company): void {
    this.contextService.setCurrentCompany(company as any);
    this.showCompanyDropdown.set(false);
    // Opcional: Recargar la página para actualizar el contexto
    window.location.reload();
  }

  isActiveCompany(company: Company): boolean {
    const current = this.contextService.currentCompany();
    return current?.id?.toString() === company.id?.toString();
  }

  toggleUserMenu(): void {
    this.showUserMenu.set(!this.showUserMenu());
    // Cerrar notificaciones al abrir menú de usuario
    if (this.showUserMenu()) {
      this.showNotifications.set(false);
    }
  }

  toggleNotifications(): void {
    this.showNotifications.set(!this.showNotifications());
    // Cerrar menú de usuario al abrir notificaciones
    if (this.showNotifications()) {
      this.showUserMenu.set(false);
    }
  }

  deleteNotification(id: string): void {
    this.wsService.deleteNotification(id);
  }

  markAsRead(id: string): void {
    this.wsService.markAsRead(id);
  }

  markAllAsRead(): void {
    this.wsService.markAllAsRead();
  }

  clearAllNotifications(): void {
    this.wsService.clearAll();
  }

  get unreadCount(): number {
    return this.wsService.unreadCount();
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
    const userMenuContainer = target.closest('.user-menu-container');
    const notificationsContainer = target.closest('.notifications-container');
    const companyDropdownContainer = target.closest('.company-dropdown-container');
    
    // Cerrar menú de usuario si el clic no está dentro de él
    if (!userMenuContainer && this.showUserMenu()) {
      this.showUserMenu.set(false);
    }
    
    // Cerrar notificaciones si el clic no está dentro de ellas
    if (!notificationsContainer && this.showNotifications()) {
      this.showNotifications.set(false);
    }
    
    // Cerrar dropdown de empresas si el clic no está dentro de él
    if (!companyDropdownContainer && this.showCompanyDropdown()) {
      this.showCompanyDropdown.set(false);
    }
  }
}