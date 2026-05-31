import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetService, Budget, BudgetLine, BudgetExecution, BudgetStatus } from '../../../../core/services/budget.service';

@Component({
  selector: 'app-budget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './budget.component.html',
})
export class BudgetComponent implements OnInit {
  private budgetService = inject(BudgetService);

  budgets = signal<Budget[]>([]);
  execution = signal<BudgetExecution | null>(null);
  isLoading = signal(false);
  yearFilter = '';
  showCreate = signal(false);
  showExecution = signal(false);

  newBudget: Partial<Budget> = {
    name: '',
    description: '',
    year: new Date().getFullYear(),
    status: 'draft',
  };

  ngOnInit() {
    this.loadBudgets();
  }

  loadBudgets() {
    this.isLoading.set(true);
    const year = this.yearFilter ? parseInt(this.yearFilter) : undefined;
    this.budgetService.findAll(year).subscribe({
      next: (data) => {
        this.budgets.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  createBudget() {
    this.budgetService.create(this.newBudget).subscribe({
      next: () => {
        this.showCreate.set(false);
        this.newBudget = { name: '', description: '', year: new Date().getFullYear(), status: 'draft' };
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
