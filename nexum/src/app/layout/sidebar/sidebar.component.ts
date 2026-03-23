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
    { icon: 'Calculator', label: 'Contabilidad', route: '/accounting' },
    { 
      icon: 'Users', 
      label: 'Recursos Humanos', 
      route: '/hr' 
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
    const baseMenu = [
      { icon: 'Users', label: 'Usuarios', route: '/settings/users' },
      { icon: 'Cog', label: 'General', route: '/settings/general' }
    ];
    
    // Agregar "Empresas" solo si es multi-company
    if (this.authService.isMultiCompany()) {
      baseMenu.unshift({ 
        icon: 'Building', 
        label: 'Empresas', 
        route: '/settings/companies' 
      });
    }
    
    return baseMenu;
  }
}
