import { Component, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { SidebarService } from '../../core/services/sidebar.service';
import { AuthService } from '../../core/services/auth.service';
import { ContextService } from '../../core/services/context.service';

interface NavItem {
  icon: string;
  label: string;
  route?: string;
  hasSubmenu?: boolean;
  submenu?: NavItem[];
  isExpanded?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent {
  private sidebarService = inject(SidebarService);
  private authService = inject(AuthService);
  private contextService = inject(ContextService);
  private router = inject(Router);

  isCollapsed = this.sidebarService.isCollapsed;

  get companyName(): string {
    return this.contextService.currentCompany()?.name || '';
  }

  get companyInitial(): string {
    const name = this.contextService.currentCompany()?.name;
    return name ? name.charAt(0).toUpperCase() : 'N';
  }

  get isMultiCompany(): boolean {
    return this.authService.isMultiCompany();
  }

  get currentUser() {
    return this.authService.currentUser();
  }

  get filteredNavItems(): NavItem[] {
    const user = this.authService.currentUser();
    if (!user) return [];

    // Si es facturador, solo mostrar Dashboard y Facturacion
    if (user.role === 'facturador') {
      return this.navItems.filter(item => 
        item.label === 'Dashboard' || 
        item.label === 'Facturacion'
      );
    }

    let items = [...this.navItems];

    // Solo superadmin ve "Solicitudes" (gestión de acceso al sistema)
    if (user.role === 'superadmin') {
      items.splice(1, 0, { 
        icon: 'ClipboardList', 
        label: 'Solicitudes', 
        route: '/admin/tenant-requests' 
      });
    }

    return items;
  }

  navItems: NavItem[] = [
    { icon: 'Home', label: 'Dashboard', route: '/dashboard' },
    { 
      icon: 'Package', 
      label: 'Inventario', 
      route: '/inventory',
      hasSubmenu: true,
      isExpanded: false,
      submenu: [
        { icon: 'ArrowDown', label: 'Entrada', route: '/inventory/entry' },
        { icon: 'ArrowRightLeft', label: 'Movimientos', route: '/inventory/movements' },
        { icon: 'FileText', label: 'Reportes', route: '/inventory/reports' },
        { icon: 'Warehouse', label: 'Almacenes', route: '/inventory/warehouses' },
        { icon: 'AlertTriangle', label: 'Límites de Stock', route: '/inventory/stock-limits' }
      ]
    },
    { 
      icon: 'Receipt', 
      label: 'Facturacion', 
      route: '/billing/invoices',
      hasSubmenu: true,
      isExpanded: false,
      submenu: [
        { icon: 'FileText', label: 'Facturas', route: '/billing/invoices' }
      ]
    },
    { icon: 'Building', label: 'Activos Fijos', route: '/billing/fixed-assets' },
    { 
      icon: 'Calculator', 
      label: 'Contabilidad', 
      route: '/accounting',
      hasSubmenu: true,
      isExpanded: false,
      submenu: [
        { icon: 'BookOpen', label: 'Asientos', route: '/accounting/entries' },
        { icon: 'List', label: 'Cuentas', route: '/accounting/accounts' },
        { icon: 'Building', label: 'Centros de Costo', route: '/accounting/cost-centers' },
        { icon: 'FileText', label: 'Informes', route: '/accounting/reports' }
      ]
    },
    { 
      icon: 'Users', 
      label: 'Recursos Humanos', 
      route: '/hr/employees'
    },
    { 
      icon: 'Settings', 
      label: 'Configuracion', 
      route: '/settings',
      hasSubmenu: true,
      isExpanded: false,
      submenu: []
    },
    { icon: 'Mail', label: 'Mensajes', route: '/messages' }
  ];

  toggleSidebar(): void {
    this.sidebarService.toggleSidebar();
  }

  toggleSubmenu(item: NavItem): void {
    if (item.hasSubmenu) {
      item.isExpanded = !item.isExpanded;
      // Generar dinámicamente el submenú cuando se expanda
      if (item.isExpanded && item.label === 'Configuracion') {
        item.submenu = this.getSettingsSubmenu();
      }
    }
  }

  switchCompany(): void {
    this.router.navigate(['/company-selection']);
  }

  getSettingsSubmenu(): NavItem[] {
    const user = this.authService.currentUser();
    const baseMenu: NavItem[] = [];
    
    // Agregar opciones según el rol
    if (user?.role === 'admin' || user?.role === 'superadmin') {
      // Admin y superadmin ven todo
      baseMenu.push({ icon: 'Users', label: 'Usuarios', route: '/settings/users' });
      baseMenu.push({ icon: 'Cog', label: 'General', route: '/settings/general' });
      
      // Agregar "Empresas" solo si es multi-company y es admin
      if (this.authService.isMultiCompany()) {
        baseMenu.unshift({ 
          icon: 'Building', 
          label: 'Empresas', 
          route: '/settings/companies' 
        });
      }
    } else if (user?.role === 'user' || user?.role === 'facturador') {
      // User y facturador solo ven "General", no ven "Usuarios" ni "Empresas"
      baseMenu.push({ icon: 'Cog', label: 'General', route: '/settings/general' });
    }
    
    return baseMenu;
  }
}
