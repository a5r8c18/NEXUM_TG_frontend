import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FinanceService } from '../../core/services/finance.service';

@Component({
  selector: 'app-finance-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold mb-6 dark:text-white">Finanzas</h1>

      @if (isLoading()) {
        <div class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <!-- CxC -->
          <a routerLink="/finance/receivables" class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow cursor-pointer">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-medium text-slate-500 dark:text-slate-400">Cuentas por Cobrar</span>
              <span class="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold px-2 py-1 rounded-full">CxC</span>
            </div>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">{{ dashboard()?.receivables?.total || 0 }}</p>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Pendiente: {{ formatCurrency(dashboard()?.receivables?.totalPending) }}</p>
          </a>

          <!-- CxP -->
          <a routerLink="/finance/payables" class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow cursor-pointer">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-medium text-slate-500 dark:text-slate-400">Cuentas por Pagar</span>
              <span class="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-semibold px-2 py-1 rounded-full">CxP</span>
            </div>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">{{ dashboard()?.payables?.total || 0 }}</p>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Pendiente: {{ formatCurrency(dashboard()?.payables?.totalPending) }}</p>
          </a>

          <!-- Bancos -->
          <a routerLink="/finance/banks" class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow cursor-pointer">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-medium text-slate-500 dark:text-slate-400">Cuentas Bancarias</span>
              <span class="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-semibold px-2 py-1 rounded-full">Bancos</span>
            </div>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">{{ dashboard()?.banks?.activeAccounts || 0 }}</p>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Saldo: {{ formatCurrency(dashboard()?.banks?.totalBalance) }}</p>
          </a>

          <!-- Caja -->
          <a routerLink="/finance/cash" class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow cursor-pointer">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-medium text-slate-500 dark:text-slate-400">Caja (Efectivo)</span>
              <span class="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-semibold px-2 py-1 rounded-full">Caja</span>
            </div>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">{{ dashboard()?.cash?.openRegisters || 0 }}/{{ dashboard()?.cash?.total || 0 }}</p>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Saldo: {{ formatCurrency(dashboard()?.cash?.totalBalance) }}</p>
          </a>

          <!-- Pagos -->
          <a routerLink="/finance/payments" class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow cursor-pointer">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-medium text-slate-500 dark:text-slate-400">Cobros y Pagos</span>
              <span class="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-semibold px-2 py-1 rounded-full">Pagos</span>
            </div>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">{{ dashboard()?.payments?.total || 0 }}</p>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Cobrado: {{ formatCurrency(dashboard()?.payments?.totalReceived) }}</p>
          </a>
        </div>

        @if (dashboard()?.receivables?.totalOverdue) {
          <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mb-6">
            <p class="text-amber-800 dark:text-amber-300 font-medium">
              Hay {{ formatCurrency(dashboard()?.receivables?.totalOverdue) }} en cuentas por cobrar vencidas.
            </p>
          </div>
        }
      }
    </div>
  `
})
export class FinanceDashboardComponent implements OnInit {
  private financeService = inject(FinanceService);

  dashboard = signal<any>(null);
  isLoading = signal(false);

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.isLoading.set(true);
    this.financeService.getDashboard().subscribe({
      next: (data) => {
        this.dashboard.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  formatCurrency(value: number | undefined): string {
    if (!value) return '$0.00';
    return new Intl.NumberFormat('es-CU', { style: 'currency', currency: 'CUP' }).format(value);
  }
}
