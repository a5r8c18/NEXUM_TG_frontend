import { Component, signal, inject, HostListener, OnInit, OnDestroy, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ContextService } from '../../core/services/context.service';
import { CompanyService } from '../../core/services/company.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { Company } from '../../models/company.models';
import { firstValueFrom } from 'rxjs';
import { SubscriptionService } from '../../core/services/subscription.service';
import { NetworkStatusService } from '../../core/services/network-status.service';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [DatePipe, ThemeToggleComponent],
  templateUrl: './header.component.html'
})
export class HeaderComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private contextService = inject(ContextService);
  private router = inject(Router);
  private companyService = inject(CompanyService);
  wsService = inject(WebSocketService);
  subscriptionService = inject(SubscriptionService);
  networkStatus = inject(NetworkStatusService);
  public themeService = inject(ThemeService);

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

  get headerThemeClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'bg-gradient-to-b from-slate-50 to-slate-100 px-6 py-3 shadow-sm border-b border-slate-200 flex justify-between items-center';
    } else {
      return 'bg-gradient-to-b from-slate-900 to-slate-800 px-6 py-3 shadow-sm border-b border-slate-700 flex justify-between items-center';
    }
  }

  get titleTextClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'text-lg font-light text-slate-900 tracking-tight';
    } else {
      return 'text-lg font-light text-white tracking-tight';
    }
  }

  get companySelectorClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'hidden sm:flex items-center gap-2 bg-slate-200/50 hover:bg-slate-300/50 border border-slate-300 text-slate-700 hover:text-slate-900 px-4 py-2 rounded-lg text-sm transition-all duration-200 min-w-[200px] justify-between';
    } else {
      return 'hidden sm:flex items-center gap-2 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600 text-slate-300 hover:text-white px-4 py-2 rounded-lg text-sm transition-all duration-200 min-w-[200px] justify-between';
    }
  }

  get notificationButtonClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-colors';
    } else {
      return 'relative p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors';
    }
  }

  get dropdownClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl shadow-black/10 overflow-hidden z-50';
    } else {
      return 'absolute right-0 top-full mt-2 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl shadow-black/30 overflow-hidden z-50';
    }
  }

  get dropdownHeaderClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'px-4 py-3 border-b border-slate-200';
    } else {
      return 'px-4 py-3 border-b border-slate-700';
    }
  }

  get dropdownHeaderTextClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'text-sm font-semibold text-slate-900';
    } else {
      return 'text-sm font-semibold text-white';
    }
  }

  get dropdownItemClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3 border-b border-slate-100 last:border-b-0';
    } else {
      return 'w-full text-left px-4 py-3 hover:bg-slate-700/50 transition-colors flex items-start gap-3 border-b border-slate-700/50 last:border-b-0';
    }
  }

  get dropdownItemTextClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'text-sm font-medium text-slate-900';
    } else {
      return 'text-sm font-medium text-white';
    }
  }

  get dropdownItemSubtextClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'text-xs text-slate-500 mt-1';
    } else {
      return 'text-xs text-slate-400 mt-1';
    }
  }

  getUserMenuButtonClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'flex items-center gap-2 hover:bg-slate-200/50 rounded-lg p-1.5 pr-3 transition-colors';
    } else {
      return 'flex items-center gap-2 hover:bg-slate-700/50 rounded-lg p-1.5 pr-3 transition-colors';
    }
  }

  getUserNameClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'text-sm font-medium text-slate-900 leading-tight';
    } else {
      return 'text-sm font-medium text-white leading-tight';
    }
  }

  getUserRoleClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'text-xs text-slate-600 leading-tight';
    } else {
      return 'text-xs text-slate-400 leading-tight';
    }
  }

  getUserChevronClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'w-4 h-4 text-slate-600 hidden sm:block transition-transform';
    } else {
      return 'w-4 h-4 text-slate-400 hidden sm:block transition-transform';
    }
  }

  ngOnInit(): void {
    this.wsService.connect();
    if (this.isMultiCompany) {
      this.loadCompanies();
    }
    this.checkSubscription();
  }

  private async checkSubscription(): Promise<void> {
    try {
      await this.subscriptionService.checkAccess();
    } catch {
      // Silently fail — offline or network error
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