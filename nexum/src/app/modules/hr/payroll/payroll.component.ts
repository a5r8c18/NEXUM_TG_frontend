import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PayrollService } from '../../../core/services/payroll.service';

@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold dark:text-white">Nómina</h1>
        <button (click)="showCreate.set(true)" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">+ Nueva Nómina</button>
      </div>

      <div class="flex gap-3 mb-4">
        <select [(ngModel)]="statusFilter" (ngModelChange)="loadData()" class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:text-white text-sm">
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="processed">Procesada</option>
          <option value="paid">Pagada</option>
          <option value="cancelled">Cancelada</option>
        </select>
        <select [(ngModel)]="periodFilter" (ngModelChange)="loadData()" class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:text-white text-sm">
          <option value="">Todos los períodos</option>
          <option value="2026-05">Mayo 2026</option>
          <option value="2026-04">Abril 2026</option>
          <option value="2026-03">Marzo 2026</option>
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
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">ID</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Período</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Fecha Pago</th>
                <th class="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Total Bruto</th>
                <th class="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Total Neto</th>
                <th class="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Empleados</th>
                <th class="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Estado</th>
                <th class="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (payroll of items(); track payroll.id) {
                <tr class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td class="px-4 py-3 dark:text-slate-300 font-mono text-xs">{{ payroll.id.slice(0, 8) }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ payroll.period }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ payroll.paymentDate }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ payroll.totalGross | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 text-right font-semibold dark:text-white">{{ payroll.totalNet | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ payroll.employeeCount || 0 }}</td>
                  <td class="px-4 py-3 text-center">
                    <span [class]="getStatusClass(payroll.status)" class="px-2 py-1 rounded-full text-xs font-medium">{{ getStatusLabel(payroll.status) }}</span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    @if (payroll.status === 'draft') {
                      <button (click)="process(payroll.id)" class="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors mr-1">Procesar</button>
                    }
                    @if (payroll.status === 'processed') {
                      <button (click)="markAsPaid(payroll.id)" class="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition-colors mr-1">Marcar Pagada</button>
                    }
                    @if (['draft', 'processed'].includes(payroll.status)) {
                      <button (click)="cancel(payroll.id)" class="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition-colors">Cancelar</button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="8" class="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No hay nóminas</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `
})
export class PayrollComponent implements OnInit {
  private payrollService = inject(PayrollService);
  items = signal<any[]>([]);
  isLoading = signal(false);
  showCreate = signal(false);
  statusFilter = '';
  periodFilter = '';
  fromDate = '';
  toDate = '';

  ngOnInit() { this.loadData(); }

  loadData() {
    this.isLoading.set(true);
    this.payrollService.getAll({
      status: this.statusFilter || undefined,
      period: this.periodFilter || undefined,
      startDate: this.fromDate || undefined,
      endDate: this.toDate || undefined,
    }).subscribe({
      next: (data) => { this.items.set(data); this.isLoading.set(false); },
      error: () => this.isLoading.set(false),
    });
  }

  process(id: number) {
    this.payrollService.process(id, 'system').subscribe(() => this.loadData());
  }

  markAsPaid(id: number) {
    if (confirm('¿Marcar esta nómina como pagada?')) {
      this.payrollService.markAsPaid(id).subscribe(() => this.loadData());
    }
  }

  cancel(id: number) {
    if (confirm('¿Cancelar esta nómina?')) {
      // Necesitaríamos un endpoint para cancelar en el backend
      console.log('Cancelar nómina', id);
    }
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
      processed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return map[status] || 'bg-slate-100 text-slate-800';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      draft: 'Borrador',
      processed: 'Procesada',
      paid: 'Pagada',
      cancelled: 'Cancelada',
    };
    return map[status] || status;
  }
}
