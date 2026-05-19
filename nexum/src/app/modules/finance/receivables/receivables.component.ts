import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanceService } from '../../../core/services/finance.service';

@Component({
  selector: 'app-receivables',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold dark:text-white">Cuentas por Cobrar</h1>
        <button (click)="showCreate.set(true)" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          + Nueva CxC
        </button>
      </div>

      <div class="flex gap-3 mb-4">
        <select [(ngModel)]="statusFilter" (ngModelChange)="loadData()" class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:text-white text-sm">
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="partial">Parcial</option>
          <option value="overdue">Vencida</option>
          <option value="paid">Pagada</option>
        </select>
        <input type="text" [(ngModel)]="searchTerm" (ngModelChange)="loadData()" placeholder="Buscar cliente..." class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:text-white text-sm flex-1" />
      </div>

      @if (isLoading()) {
        <div class="flex justify-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      } @else {
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">No.</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Cliente</th>
                <th class="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Monto Original</th>
                <th class="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Saldo</th>
                <th class="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Vencimiento</th>
                <th class="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (ar of items(); track ar.id) {
                <tr class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td class="px-4 py-3 dark:text-slate-300">{{ ar.arNumber }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ ar.customerName }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ ar.originalAmount | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 text-right font-semibold dark:text-white">{{ ar.balanceAmount | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 text-center dark:text-slate-300">{{ ar.dueDate }}</td>
                  <td class="px-4 py-3 text-center">
                    <span [class]="getStatusClass(ar.status)" class="px-2 py-1 rounded-full text-xs font-medium">{{ getStatusLabel(ar.status) }}</span>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No hay cuentas por cobrar</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `
})
export class ReceivablesComponent implements OnInit {
  private financeService = inject(FinanceService);
  items = signal<any[]>([]);
  isLoading = signal(false);
  showCreate = signal(false);
  statusFilter = '';
  searchTerm = '';

  ngOnInit() { this.loadData(); }

  loadData() {
    this.isLoading.set(true);
    this.financeService.getReceivables({
      status: this.statusFilter || undefined,
      customerName: this.searchTerm || undefined,
    }).subscribe({
      next: (data) => { this.items.set(data); this.isLoading.set(false); },
      error: () => this.isLoading.set(false),
    });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      partial: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return map[status] || 'bg-slate-100 text-slate-800';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = { pending: 'Pendiente', partial: 'Parcial', paid: 'Pagada', overdue: 'Vencida', written_off: 'Incobrable', disputed: 'Disputada' };
    return map[status] || status;
  }
}
