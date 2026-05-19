import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanceService } from '../../../core/services/finance.service';

@Component({
  selector: 'app-banks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold dark:text-white">Cuentas Bancarias</h1>
        <button (click)="showCreate.set(true)" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">+ Nueva Cuenta</button>
      </div>
      <div class="flex gap-3 mb-4">
        <select [(ngModel)]="statusFilter" (ngModelChange)="loadData()" class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:text-white text-sm">
          <option value="">Todos</option>
          <option value="active">Activa</option>
          <option value="inactive">Inactiva</option>
          <option value="frozen">Congelada</option>
        </select>
        <select [(ngModel)]="typeFilter" (ngModelChange)="loadData()" class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:text-white text-sm">
          <option value="">Todos los tipos</option>
          <option value="checking">Cuenta Corriente</option>
          <option value="savings">Ahorro</option>
          <option value="investment">Inversión</option>
          <option value="credit">Crédito</option>
        </select>
      </div>
      @if (isLoading()) {
        <div class="flex justify-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      } @else {
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Cuenta</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Banco</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Titular</th>
                <th class="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Saldo</th>
                <th class="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Disponible</th>
                <th class="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (bank of items(); track bank.id) {
                <tr class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td class="px-4 py-3 dark:text-slate-300">
                    <div>
                      <div class="font-medium">{{ bank.accountNumber }}</div>
                      <div class="text-xs text-slate-500 dark:text-slate-400">{{ bank.accountType }}</div>
                    </div>
                  </td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ bank.bankName }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ bank.holderName }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ bank.balance | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ bank.availableBalance | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 text-center">
                    <span [class]="getStatusClass(bank.status)" class="px-2 py-1 rounded-full text-xs font-medium">{{ getStatusLabel(bank.status) }}</span>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No hay cuentas bancarias</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `
})
export class BanksComponent implements OnInit {
  private financeService = inject(FinanceService);
  items = signal<any[]>([]);
  isLoading = signal(false);
  showCreate = signal(false);
  statusFilter = '';
  typeFilter = '';

  ngOnInit() { this.loadData(); }

  loadData() {
    this.isLoading.set(true);
    this.financeService.getBanks({ 
      status: this.statusFilter || undefined,
      accountType: this.typeFilter || undefined,
    }).subscribe({
      next: (data) => { this.items.set(data); this.isLoading.set(false); },
      error: () => this.isLoading.set(false),
    });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      inactive: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
      frozen: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    };
    return map[status] || 'bg-slate-100 text-slate-800';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = { active: 'Activa', inactive: 'Inactiva', frozen: 'Congelada', closed: 'Cerrada' };
    return map[status] || status;
  }
}
