import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanceService } from '../../../core/services/finance.service';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold dark:text-white">Cobros y Pagos</h1>
        <button (click)="showCreate.set(true)" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">+ Nuevo Pago</button>
      </div>
      <div class="flex gap-3 mb-4">
        <select [(ngModel)]="typeFilter" (ngModelChange)="loadData()" class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:text-white text-sm">
          <option value="">Todos</option>
          <option value="receivable">Cobros</option>
          <option value="payable">Pagos</option>
        </select>
        <select [(ngModel)]="statusFilter" (ngModelChange)="loadData()" class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:text-white text-sm">
          <option value="">Todos los estados</option>
          <option value="completed">Completado</option>
          <option value="pending">Pendiente</option>
          <option value="failed">Fallido</option>
          <option value="cancelled">Cancelado</option>
        </select>
        <input type="date" [(ngModel)]="fromDate" (ngModelChange)="loadData()" class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:text-white text-sm" />
        <input type="date" [(ngModel)]="toDate" (ngModelChange)="loadData()" class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:text-white text-sm" />
      </div>
      @if (isLoading()) {
        <div class="flex justify-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      } @else {
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">No.</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Fecha</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Tipo</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Método</th>
                <th class="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Monto</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Referencia</th>
                <th class="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (payment of items(); track payment.id) {
                <tr class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td class="px-4 py-3 dark:text-slate-300">{{ payment.paymentNumber }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ payment.paymentDate }}</td>
                  <td class="px-4 py-3">
                    <span [class]="payment.paymentType === 'receivable' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'" class="px-2 py-1 rounded-full text-xs font-medium">
                      {{ payment.paymentType === 'receivable' ? 'Cobro' : 'Pago' }}
                    </span>
                  </td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ getMethodLabel(payment.paymentMethod) }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ payment.amount | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ payment.referenceNumber || '-' }}</td>
                  <td class="px-4 py-3 text-center">
                    <span [class]="getStatusClass(payment.status)" class="px-2 py-1 rounded-full text-xs font-medium">{{ getStatusLabel(payment.status) }}</span>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No hay pagos</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `
})
export class PaymentsComponent implements OnInit {
  private financeService = inject(FinanceService);
  items = signal<any[]>([]);
  isLoading = signal(false);
  showCreate = signal(false);
  typeFilter = '';
  statusFilter = '';
  fromDate = '';
  toDate = '';

  ngOnInit() { this.loadData(); }

  loadData() {
    this.isLoading.set(true);
    this.financeService.getPayments({
      paymentType: this.typeFilter || undefined,
      status: this.statusFilter || undefined,
      fromDate: this.fromDate || undefined,
      toDate: this.toDate || undefined,
    }).subscribe({
      next: (data) => { this.items.set(data); this.isLoading.set(false); },
      error: () => this.isLoading.set(false),
    });
  }

  getMethodLabel(method: string): string {
    const map: Record<string, string> = {
      cash: 'Efectivo',
      bank_transfer: 'Transferencia',
      check: 'Cheque',
      credit_card: 'Tarjeta Crédito',
      debit_card: 'Tarjeta Débito',
      other: 'Otro',
    };
    return map[method] || method;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      cancelled: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
      refunded: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    };
    return map[status] || 'bg-slate-100 text-slate-800';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      completed: 'Completado',
      pending: 'Pendiente',
      processing: 'Procesando',
      failed: 'Fallido',
      cancelled: 'Cancelado',
      refunded: 'Reembolsado',
    };
    return map[status] || status;
  }
}
