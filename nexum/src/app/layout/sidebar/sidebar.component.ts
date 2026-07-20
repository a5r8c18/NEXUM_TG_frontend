import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SidebarService } from '../../core/services/sidebar.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';

interface NavItem {
  icon: string;
  label: string;
  route?: string;
  hasSubmenu?: boolean;
  submenu?: NavItem[];
  isExpanded?: boolean;
  isComingSoon?: boolean;
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
  public themeService = inject(ThemeService);

  isCollapsed = this.sidebarService.isCollapsed;

  get currentUser() {
    return this.authService.currentUser();
  }

  get sidebarThemeClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900 border-r border-slate-200';
    } else {
      return 'bg-gradient-to-b from-slate-900 to-slate-800 text-white border-r border-slate-700';
    }
  }

  get headerBorderClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'border-b border-slate-200/50';
    } else {
      return 'border-b border-slate-700/50';
    }
  }

  get navItemClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'text-slate-900 rounded-lg transition-all duration-200 hover:bg-slate-200/50 hover:text-slate-950 group';
    } else {
      return 'text-slate-300 rounded-lg transition-all duration-200 hover:bg-slate-700/50 hover:text-white group';
    }
  }

  get navSubItemClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'text-slate-900 rounded-lg transition-all duration-200 hover:bg-slate-100/50 hover:text-slate-950 text-sm';
    } else {
      return 'text-slate-400 rounded-lg transition-all duration-200 hover:bg-slate-700/30 hover:text-white text-sm';
    }
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

    // Solo superadmin ve "Solicitudes" y "Suscripciones"
    if (user.role === 'superadmin') {
      items.splice(1, 0, 
        { icon: 'ClipboardList', label: 'Solicitudes', route: '/admin/tenant-requests' },
        { icon: 'CreditCard', label: 'Suscripciones', route: '/admin/subscriptions' }
      );
    }

    return items;
  }

  navItems: NavItem[] = [
    { icon: 'Home', label: 'Dashboard', route: '/dashboard' },
    { 
      icon: 'Settings', 
      label: 'Configuracion', 
      route: '/settings',
      hasSubmenu: true,
      isExpanded: false,
      submenu: []
    },
    { 
      icon: 'Calculator', 
      label: 'Contabilidad', 
      route: '/accounting',
      hasSubmenu: true,
      isExpanded: false,
      submenu: [
        { icon: 'FileText', label: 'Informes', route: '/accounting/reports' },
        { icon: 'List', label: 'Cuentas', route: '/accounting/accounts' },
        { icon: 'Layers', label: 'Elementos', route: '/accounting/elementos' },
        { icon: 'Building', label: 'Centro de Costo', route: '/accounting/cost-centers' },
        { icon: 'BookOpen', label: 'Ejercicio Económico', route: '/accounting/fiscal-years' },
        { icon: 'BarChart3', label: 'Presupuesto', route: '/accounting/budget' }
      ]
    },
    {
      icon: 'DollarSign',
      label: 'Finanzas',
      route: '/finance',
      hasSubmenu: true,
      isExpanded: false,
      submenu: [
        { icon: 'TrendingUp', label: 'Cuentas por Cobrar', route: '/finance/receivables' },
        { icon: 'TrendingDown', label: 'Cuentas por Pagar', route: '/finance/payables' },
        { icon: 'CreditCard', label: 'Cuentas Bancarias', route: '/finance/banks' },
        { icon: 'Banknote', label: 'Caja (Efectivo)', route: '/finance/cash' },
        { icon: 'DollarSign', label: 'Cobros y Pagos', route: '/finance/payments' },
        { icon: 'Database', label: 'Conciliación Bancaria', route: '/finance/bank-reconciliation' }
      ]
    },
    { 
      icon: 'Users', 
      label: 'Recursos Humanos', 
      route: '/hr',
      hasSubmenu: true,
      isExpanded: false,
      submenu: [
        { icon: 'UserCheck', label: 'Empleados', route: '/hr/employees' },
        { icon: 'Building', label: 'Departamentos', route: '/hr/departments' },
        { icon: 'FileText', label: 'Contratos', route: '/hr/contracts' },
        { icon: 'Clock', label: 'Asistencia', route: '/hr/attendance' },
        { icon: 'Calendar', label: 'Vacaciones / Licencias', route: '/hr/leaves' },
        { icon: 'Wallet', label: 'Nómina', route: '/hr/payroll' }
      ]
    },
    { 
      icon: 'Package', 
      label: 'Inventario', 
      route: '/inventory',
      hasSubmenu: true,
      isExpanded: false,
      submenu: [
        { icon: 'Database', label: 'Catálogo', route: '/inventory/catalog' },
        { icon: 'ArrowRightLeft', label: 'Movimientos', route: '/inventory/movements' },
        { icon: 'ShoppingCart', label: 'Órdenes de Compra', route: '/inventory/purchase-orders', isComingSoon: true },
        { icon: 'FileText', label: 'Reportes', route: '/inventory/reports' },
        { icon: 'Search', label: 'Conteo Físico', route: '/inventory/physical-count', isComingSoon: true },
        { icon: 'BarChart3', label: 'Analítica', route: '/inventory/analytics' },
        { icon: 'Truck', label: 'Proveedores', route: '/inventory/suppliers' },
        { icon: 'Warehouse', label: 'Almacenes', route: '/inventory/warehouses' },
        { icon: 'AlertTriangle', label: 'Límites de Stock', route: '/inventory/stock-limits' }
      ]
    },
    { icon: 'Building', label: 'Activos Fijos', route: '/billing/fixed-assets' },
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
