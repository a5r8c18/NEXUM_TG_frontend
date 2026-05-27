import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetService, Budget, BudgetLine, BudgetExecution, BudgetStatus } from '../../../core/services/budget.service';

@Component({
  selector: 'app-budget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold dark:text-white">Presupuesto</h1>
        <div class="flex gap-3">
          <select [(ngModel)]="yearFilter" (ngModelChange)="loadBudgets()" class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:text-white text-sm">
            <option value="">Todos los años</option>
            <option value="2024">2024</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>
          <button (click)="showCreate.set(true)" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">+ Nuevo Presupuesto</button>
        </div>
      </div>

      @if (isLoading()) {
        <div class="flex justify-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      } @else {
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Nombre</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Año</th>
                <th class="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Monto Total</th>
                <th class="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Estado</th>
                <th class="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (budget of budgets(); track budget.id) {
                <tr class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td class="px-4 py-3 dark:text-slate-300">
                    <div class="font-medium">{{ budget.name }}</div>
                    @if (budget.description) {
                      <div class="text-xs text-slate-500">{{ budget.description }}</div>
                    }
                  </td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ budget.year }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300 font-mono">${{ formatNumber(budget.totalAmount) }}</td>
                  <td class="px-4 py-3 text-center">
                    <span [class]="getStatusClass(budget.status)" class="px-2 py-1 rounded-full text-xs font-medium">
                      {{ getStatusLabel(budget.status) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <div class="flex justify-center gap-2">
                      <button (click)="viewExecution(budget.id)" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm">Ver</button>
                      @if (budget.status === 'draft') {
                        <button (click)="approveBudget(budget.id)" class="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 text-sm">Aprobar</button>
                      }
                      <button (click)="deleteBudget(budget.id)" class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm">Eliminar</button>
                    </div>
                  </td>
                </tr>
              }
              @if (budgets().length === 0) {
                <tr>
                  <td colspan="5" class="px-4 py-8 text-center text-slate-500">No hay presupuestos registrados</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (showCreate()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showCreate.set(false)">
          <div class="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-lg" (click)="$event.stopPropagation()">
            <h2 class="text-xl font-bold mb-4 dark:text-white">Nuevo Presupuesto</h2>
            <form (ngSubmit)="createBudget()">
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre</label>
                  <input [(ngModel)]="newBudget.name" required class="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:text-white">
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
                  <textarea [(ngModel)]="newBudget.description" rows="2" class="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:text-white"></textarea>
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Año</label>
                  <input [(ngModel)]="newBudget.year" type="number" required class="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:text-white">
                </div>
              </div>
              <div class="flex justify-end gap-3 mt-6">
                <button type="button" (click)="showCreate.set(false)" class="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Cancelar</button>
                <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Crear</button>
              </div>
            </form>
          </div>
        </div>
      }

      @if (showExecution()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto" (click)="showExecution.set(false)">
          <div class="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-4xl my-8" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-bold dark:text-white">Ejecución del Presupuesto</h2>
              <button (click)="showExecution.set(false)" class="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">✕</button>
            </div>
            @if (execution()) {
              <div class="space-y-4">
                <div class="grid grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                  <div>
                    <div class="text-xs text-slate-500 dark:text-slate-400">Planificado</div>
                    <div class="text-lg font-bold dark:text-white">${{ formatNumber(execution()!.totalPlanned) }}</div>
                  </div>
                  <div>
                    <div class="text-xs text-slate-500 dark:text-slate-400">Ejecutado</div>
                    <div class="text-lg font-bold dark:text-white">${{ formatNumber(execution()!.totalActual) }}</div>
                  </div>
                  <div>
                    <div class="text-xs text-slate-500 dark:text-slate-400">Desviación</div>
                    <div class="text-lg font-bold" [class]="execution()!.totalDeviation > 0 ? 'text-green-600' : 'text-red-600'">${{ formatNumber(execution()!.totalDeviation) }}</div>
                  </div>
                  <div>
                    <div class="text-xs text-slate-500 dark:text-slate-400">% Desviación</div>
                    <div class="text-lg font-bold" [class]="execution()!.deviationPercentage >= 0 ? 'text-green-600' : 'text-red-600'">{{ execution()!.deviationPercentage.toFixed(1) }}%</div>
                  </div>
                </div>
                <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <table class="w-full text-sm">
                    <thead class="bg-slate-50 dark:bg-slate-900/50">
                      <tr>
                        <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Cuenta</th>
                        <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Mes</th>
                        <th class="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Planificado</th>
                        <th class="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Ejecutado</th>
                        <th class="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Desviación</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (line of execution()!.lines; track line.id) {
                        <tr class="border-t border-slate-100 dark:border-slate-700">
                          <td class="px-4 py-3 dark:text-slate-300">
                            <div class="font-medium">{{ line.accountCode }}</div>
                            <div class="text-xs text-slate-500">{{ line.accountName }}</div>
                          </td>
                          <td class="px-4 py-3 dark:text-slate-300">{{ line.month || '-' }}</td>
                          <td class="px-4 py-3 text-right dark:text-slate-300 font-mono">${{ formatNumber(line.plannedAmount) }}</td>
                          <td class="px-4 py-3 text-right dark:text-slate-300 font-mono">${{ formatNumber(line.actualAmount) }}</td>
                          <td class="px-4 py-3 text-right font-mono" [class]="line.deviation >= 0 ? 'text-green-600' : 'text-red-600'">${{ formatNumber(line.deviation) }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class BudgetComponent implements OnInit {
  private budgetService = inject(BudgetService);

  budgets = signal<Budget[]>([]);
  execution = signal<BudgetExecution | null>(null);
  isLoading = signal(false);
  yearFilter = signal('');
  showCreate = signal(false);
  showExecution = signal(false);

  newBudget = signal<Partial<Budget>>({
    name: '',
    description: '',
    year: new Date().getFullYear(),
    status: 'draft',
  });

  ngOnInit() {
    this.loadBudgets();
  }

  loadBudgets() {
    this.isLoading.set(true);
    const year = this.yearFilter() ? parseInt(this.yearFilter()) : undefined;
    this.budgetService.findAll(year).subscribe({
      next: (data) => {
        this.budgets.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  createBudget() {
    this.budgetService.create(this.newBudget()).subscribe({
      next: () => {
        this.showCreate.set(false);
        this.newBudget.set({ name: '', description: '', year: new Date().getFullYear(), status: 'draft' });
        this.loadBudgets();
      },
    });
  }

  viewExecution(id: string) {
    this.budgetService.getExecution(id).subscribe({
      next: (data) => {
        this.execution.set(data);
        this.showExecution.set(true);
      },
    });
  }

  approveBudget(id: string) {
    if (confirm('¿Aprobar este presupuesto?')) {
      this.budgetService.approve(id).subscribe({
        next: () => this.loadBudgets(),
      });
    }
  }

  deleteBudget(id: string) {
    if (confirm('¿Eliminar este presupuesto?')) {
      this.budgetService.deleteBudget(id).subscribe({
        next: () => this.loadBudgets(),
      });
    }
  }

  getStatusClass(status: BudgetStatus): string {
    const classes = {
      draft: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
      approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      closed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };
    return classes[status] || classes.draft;
  }

  getStatusLabel(status: BudgetStatus): string {
    const labels = {
      draft: 'Borrador',
      approved: 'Aprobado',
      active: 'Activo',
      closed: 'Cerrado',
    };
    return labels[status] || status;
  }

  formatNumber(value: number): string {
    return value.toLocaleString('es-CU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
