import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { ContextService } from '../core/services/context.service';

interface DashboardCard {
  title: string;
  content: string;
  icon: string;
  value: string;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  color: string;
}

interface ModuleCard {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent {
  private authService = inject(AuthService);
  private contextService = inject(ContextService);
  private router = inject(Router);

  get userName(): string {
    return this.authService.currentUser()?.firstName || 'Usuario';
  }

  get companyName(): string {
    return this.contextService.currentCompany()?.name || '';
  }

  get isMultiCompany(): boolean {
    return this.authService.isMultiCompany();
  }

  get tenantName(): string {
    return this.authService.getCurrentUserTenant()?.name || '';
  }

  cards: DashboardCard[] = [
    {
      title: 'Productos en Stock',
      content: 'Total de productos activos en inventario',
      icon: 'Package',
      value: '1,248',
      trend: 'up',
      trendValue: '+12%',
      color: 'blue'
    },
    {
      title: 'Facturas del Mes',
      content: 'Facturas emitidas este mes',
      icon: 'Receipt',
      value: '86',
      trend: 'up',
      trendValue: '+8%',
      color: 'green'
    },
    {
      title: 'Movimientos Hoy',
      content: 'Entradas y salidas registradas hoy',
      icon: 'ArrowRightLeft',
      value: '34',
      trend: 'neutral',
      trendValue: '0%',
      color: 'purple'
    },
    {
      title: 'Activos Fijos',
      content: 'Total de activos fijos registrados',
      icon: 'Building',
      value: '156',
      trend: 'down',
      trendValue: '-2%',
      color: 'orange'
    }
  ];

  modules: ModuleCard[] = [
    {
      title: 'Inventario',
      description: 'Control de stock, entradas, salidas y reportes',
      icon: 'Package',
      route: '/inventory',
      color: 'orange'
    },
    {
      title: 'Facturacion',
      description: 'Emision de facturas, clientes y cobros',
      icon: 'Receipt',
      route: '/billing/invoices',
      color: 'green'
    },
    {
      title: 'Activos Fijos',
      description: 'Registro, depreciacion y catalogo de activos',
      icon: 'Building',
      route: '/billing/fixed-assets',
      color: 'blue'
    },
    {
      title: 'Contabilidad',
      description: 'Plan de cuentas, asientos y balances',
      icon: 'Calculator',
      route: '/accounting',
      color: 'purple'
    },
    {
      title: 'Recursos Humanos',
      description: 'Empleados, nomina y control de asistencia',
      icon: 'Users',
      route: '/hr',
      color: 'indigo'
    },
    {
      title: 'Reportes',
      description: 'Reportes de recepcion y entrega',
      icon: 'FileText',
      route: '/inventory/reports',
      color: 'teal'
    }
  ];

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  switchCompany(): void {
    this.router.navigate(['/company-selection']);
  }
}
