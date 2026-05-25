import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanceService } from '../../../core/services/finance.service';

@Component({
  selector: 'app-cash',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold dark:text-white">Caja (Efectivo - Cuenta 101)</h1>
        <button (click)="showCreate.set(true)" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">+ Nueva Caja</button>
      </div>

      @if (isLoading()) {
        <div class="flex justify-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
            <div class="text-sm font-medium text-slate-500 dark:text-slate-400">Total Cajas</div>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">{{ stats()?.total || 0 }}</p>
          </div>
          <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
            <div class="text-sm font-medium text-slate-500 dark:text-slate-400">Cajas Abiertas</div>
            <p class="text-2xl font-bold text-green-600 dark:text-green-400">{{ stats()?.openRegisters || 0 }}</p>
          </div>
          <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
            <div class="text-sm font-medium text-slate-500 dark:text-slate-400">Saldo Total</div>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">{{ formatCurrency(stats()?.totalBalance) }}</p>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Código</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Nombre</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Responsable</th>
                <th class="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Saldo</th>
                <th class="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Estado</th>
                <th class="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (cr of items(); track cr.id) {
                <tr class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td class="px-4 py-3 dark:text-slate-300 font-medium">{{ cr.registerCode }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ cr.registerName }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ cr.responsibleName }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ formatCurrency(cr.currentBalance) }}</td>
                  <td class="px-4 py-3 text-center">
                    <span [class]="getStatusClass(cr.status)" class="px-2 py-1 rounded-full text-xs font-medium">{{ getStatusLabel(cr.status) }}</span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    @if (cr.status === 'closed') {
                      <button (click)="openRegister(cr.id)" class="text-green-600 hover:text-green-700 mr-2">Abrir</button>
                    } @else {
                      <button (click)="closeRegister(cr.id)" class="text-red-600 hover:text-red-700 mr-2">Cerrar</button>
                      <button (click)="auditRegister(cr.id)" class="text-blue-600 hover:text-blue-700 mr-2">Arqueo</button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No hay cajas registradas</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `
})
export class CashComponent implements OnInit {
  private financeService = inject(FinanceService);
  items = signal<any[]>([]);
  stats = signal<any>(null);
  isLoading = signal(false);
  showCreate = signal(false);

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    Promise.all([
      this.financeService.getCashRegisters().toPromise(),
      this.financeService.getCashStats().toPromise(),
    ]).then(([registers, stats]) => {
      this.items.set(registers || []);
      this.stats.set(stats || {});
      this.isLoading.set(false);
    }).catch(() => this.isLoading.set(false));
  }

  openRegister(id: string) {
    const openingBalance = prompt('Saldo de apertura (opcional):');
    if (openingBalance !== null) {
      this.financeService.openCashRegister(id, openingBalance ? Number(openingBalance) : undefined).subscribe({
        next: () => this.loadData(),
        error: (err) => alert('Error al abrir caja: ' + err.message),
      });
    }
  }

  closeRegister(id: string) {
    if (confirm('¿Cerrar esta caja?')) {
      this.financeService.closeCashRegister(id).subscribe({
        next: () => this.loadData(),
        error: (err) => alert('Error al cerrar caja: ' + err.message),
      });
    }
  }

  auditRegister(id: string) {
    const physicalBalance = prompt('Saldo físico en caja:');
    if (physicalBalance !== null) {
      this.financeService.performCashAudit(id, Number(physicalBalance)).subscribe({
        next: (result) => {
          const diff = result.difference;
          if (diff === 0) {
            alert('Arqueo correcto. No hay diferencias.');
          } else {
            alert(`Diferencia detectada: ${diff > 0 ? '+' : ''}$${diff}`);
          }
          this.loadData();
        },
        error: (err) => alert('Error al realizar arqueo: ' + err.message),
      });
    }
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      open: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      closed: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
      suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return map[status] || 'bg-slate-100 text-slate-800';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = { open: 'Abierta', closed: 'Cerrada', suspended: 'Suspendida' };
    return map[status] || status;
  }

  formatCurrency(value: number | undefined): string {
    if (!value) return '$0.00';
    return new Intl.NumberFormat('es-CU', { style: 'currency', currency: 'CUP' }).format(value);
  }
}
