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
  showNotifications = signal(false);
  notifications = signal([
    {
      id: 1,
      title: 'Nueva factura creada',
      message: 'Factura #00123 ha sido generada',
      time: 'Hace 5 minutos',
      read: false,
      type: 'info'
    },
    {
      id: 2,
      title: 'Stock bajo',
      message: 'Producto "Laptop Dell" tiene menos de 5 unidades',
      time: 'Hace 15 minutos',
      read: false,
      type: 'warning'
    },
    {
      id: 3,
      title: 'Pago recibido',
      message: 'Cliente ABC ha pagado factura #00120',
      time: 'Hace 1 hora',
      read: true,
      type: 'success'
    },
    {
      id: 4,
      title: 'Mantenimiento programado',
      message: 'Sistema en mantenimiento mañana a las 2:00 AM',
      time: 'Hace 2 horas',
      read: true,
      type: 'info'
    }
  ]);

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
    if (!user || !user.firstName || !user.lastName) return 'U';
    return (user.firstName.charAt(0) + user.lastName.charAt(0)).toUpperCase();
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

  deleteNotification(id: number): void {
    const currentNotifications = this.notifications();
    const updatedNotifications = currentNotifications.filter(n => n.id !== id);
    this.notifications.set(updatedNotifications);
  }

  markAsRead(id: number): void {
    const currentNotifications = this.notifications();
    const updatedNotifications = currentNotifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    this.notifications.set(updatedNotifications);
  }

  markAllAsRead(): void {
    const currentNotifications = this.notifications();
    const updatedNotifications = currentNotifications.map(n => ({ ...n, read: true }));
    this.notifications.set(updatedNotifications);
  }

  clearAllNotifications(): void {
    this.notifications.set([]);
  }

  get unreadCount(): number {
    return this.notifications().filter(n => !n.read).length;
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
    
    // Cerrar menú de usuario si el clic no está dentro de él
    if (!userMenuContainer && this.showUserMenu()) {
      this.showUserMenu.set(false);
    }
    
    // Cerrar notificaciones si el clic no está dentro de ellas
    if (!notificationsContainer && this.showNotifications()) {
      this.showNotifications.set(false);
    }
  }
}