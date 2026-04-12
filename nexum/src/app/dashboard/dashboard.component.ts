import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { ContextService } from '../core/services/context.service';
import { AccountingService } from '../core/services/accounting.service';
import { CommonModule } from '@angular/common';

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
  imports: [CommonModule],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private contextService = inject(ContextService);
  private router = inject(Router);
  private accountingService = inject(AccountingService);

  // Financial KPIs signals
  totalAssets = signal<number>(0);
  totalLiabilities = signal<number>(0);
  totalEquity = signal<number>(0);
  netIncome = signal<number>(0);
  currentMonthRevenue = signal<number>(0);
  currentMonthExpenses = signal<number>(0);
  revenueTrend = signal<number>(0);
  expenseTrend = signal<number>(0);
  loadingKPIs = signal(false);

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

  cards = computed(() => [
    {
      title: 'Activos Totales',
      content: 'Valor total de activos de la empresa',
      icon: 'TrendingUp',
      value: this.formatCurrency(this.totalAssets()),
      trend: 'neutral',
      trendValue: '',
      color: 'blue'
    },
    {
      title: 'Ingresos del Mes',
      content: 'Ingresos generados este mes',
      icon: 'DollarSign',
      value: this.formatCurrency(this.currentMonthRevenue()),
      trend: this.revenueTrend() > 0 ? 'up' : this.revenueTrend() < 0 ? 'down' : 'neutral',
      trendValue: `${this.revenueTrend() > 0 ? '+' : ''}${this.revenueTrend().toFixed(1)}%`,
      color: 'green'
    },
    {
      title: 'Gastos del Mes',
      content: 'Gastos operativos del mes',
      icon: 'TrendingDown',
      value: this.formatCurrency(this.currentMonthExpenses()),
      trend: this.expenseTrend() > 0 ? 'up' : this.expenseTrend() < 0 ? 'down' : 'neutral',
      trendValue: `${this.expenseTrend() > 0 ? '+' : ''}${this.expenseTrend().toFixed(1)}%`,
      color: 'red'
    },
    {
      title: 'Utilidad Neta',
      content: 'Utilidad neta del período',
      icon: 'Calculator',
      value: this.formatCurrency(this.netIncome()),
      trend: this.netIncome() > 0 ? 'up' : this.netIncome() < 0 ? 'down' : 'neutral',
      trendValue: '',
      color: this.netIncome() > 0 ? 'green' : this.netIncome() < 0 ? 'red' : 'orange'
    }
  ]);

  ngOnInit() {
    this.loadFinancialKPIs();
  }

  loadFinancialKPIs() {
    this.loadingKPIs.set(true);
    this.accountingService.getFinancialKPIs().subscribe({
      next: (kpis) => {
        this.totalAssets.set(kpis.totalAssets || 0);
        this.totalLiabilities.set(kpis.totalLiabilities || 0);
        this.totalEquity.set(kpis.totalEquity || 0);
        this.netIncome.set(kpis.netIncome || 0);
        this.currentMonthRevenue.set(kpis.currentMonthRevenue || 0);
        this.currentMonthExpenses.set(kpis.currentMonthExpenses || 0);
        this.revenueTrend.set(kpis.revenueTrend || 0);
        this.expenseTrend.set(kpis.expenseTrend || 0);
        this.loadingKPIs.set(false);
      },
      error: () => {
        this.loadingKPIs.set(false);
      }
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

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
