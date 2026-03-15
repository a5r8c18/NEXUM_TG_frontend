import { Component, inject } from '@angular/core';
import { SidebarService } from '../../shared/sidebar.service';

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
  imports: [],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent {
  private sidebarService = inject(SidebarService);
  isCollapsed = this.sidebarService.isCollapsed;
  
  navItems: NavItem[] = [
    { icon: 'Home', label: 'Inicio', route: '/' },
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
        { icon: 'Warehouse', label: 'Almacenes', route: '/inventory/warehouses' }
      ]
    },
    { icon: 'Receipt', label: 'Facturación', route: '/billing' },
    { icon: 'Building', label: 'Activos Fijos', route: '/assets' },
    { icon: 'Calculator', label: 'Contabilidad', route: '/accounting' },
    { icon: 'Users', label: 'Recursos Humanos', route: '/hr' },
    { icon: 'Settings', label: 'Configuración', route: '/settings' },
    { icon: 'Mail', label: 'Mensajes', route: '/messages' }
  ];

  toggleSidebar(): void {
    this.sidebarService.toggleSidebar();
  }

  toggleSubmenu(item: NavItem): void {
    if (item.hasSubmenu) {
      item.isExpanded = !item.isExpanded;
    }
  }
}
