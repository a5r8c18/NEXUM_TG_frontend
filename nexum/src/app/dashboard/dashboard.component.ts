import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { ContextService } from '../core/services/context.service';
import { AccountingService } from '../core/services/accounting.service';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../core/services/theme.service';

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
  public themeService = inject(ThemeService);

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

  get dashboardBackgroundClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'flex-1 p-6 bg-gradient-to-br from-slate-50 to-slate-100';
    } else {
      return 'flex-1 p-6 bg-gradient-to-br from-slate-900 to-slate-800';
    }
  }

  get welcomeTitleClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'text-3xl font-light text-slate-900 mb-1 tracking-tight';
    } else {
      return 'text-3xl font-light text-white mb-1 tracking-tight';
    }
  }

  get welcomeTextClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'text-slate-600 text-sm';
    } else {
      return 'text-slate-400 text-sm';
    }
  }

  get companyNameClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'font-medium text-slate-800';
    } else {
      return 'font-medium text-slate-200';
    }
  }

  get changeCompanyButtonClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'text-blue-600 hover:text-blue-700 font-medium';
    } else {
      return 'text-blue-400 hover:text-blue-300 font-medium';
    }
  }

  get cardClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'bg-white/80 backdrop-blur-sm p-5 rounded-xl border border-slate-200/50 hover:shadow-lg transition-all duration-300 hover:border-slate-300/50';
    } else {
      return 'bg-slate-800/80 backdrop-blur-sm p-5 rounded-xl border border-slate-700/50 hover:shadow-lg transition-all duration-300 hover:border-slate-600/50';
    }
  }

  get cardIconContainerClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center';
    } else {
      return 'w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-600 rounded-xl flex items-center justify-center';
    }
  }

  get cardTitleClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'text-sm font-medium text-slate-600 mb-1';
    } else {
      return 'text-sm font-medium text-slate-300 mb-1';
    }
  }

  get cardValueClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'text-2xl font-bold text-slate-900 mb-2';
    } else {
      return 'text-2xl font-bold text-white mb-2';
    }
  }

  get cardTrendClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'text-xs font-medium text-slate-500';
    } else {
      return 'text-xs font-medium text-slate-400';
    }
  }

  get moduleCardClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'bg-white/60 backdrop-blur-sm p-6 rounded-xl border border-slate-200/50 hover:shadow-lg transition-all duration-300 hover:border-slate-300/50 hover:bg-white/80 cursor-pointer';
    } else {
      return 'bg-slate-800/60 backdrop-blur-sm p-6 rounded-xl border border-slate-700/50 hover:shadow-lg transition-all duration-300 hover:border-slate-600/50 hover:bg-slate-800/80 cursor-pointer';
    }
  }

  get moduleIconContainerClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center mb-4';
    } else {
      return 'w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-600 rounded-xl flex items-center justify-center mb-4';
    }
  }

  get moduleTitleClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'text-lg font-semibold text-slate-900 mb-2';
    } else {
      return 'text-lg font-semibold text-white mb-2';
    }
  }

  get moduleDescriptionClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'text-sm text-slate-600 leading-relaxed';
    } else {
      return 'text-sm text-slate-400 leading-relaxed';
    }
  }

  get modulesTitleClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'text-lg font-medium text-slate-800 mb-4';
    } else {
      return 'text-lg font-medium text-white mb-4';
    }
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
