import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BankReconciliationService, BankReconciliation, ReconciliationStatus } from '../../../core/services/bank-reconciliation.service';
import { FinanceService } from '../../../core/services/finance.service';

@Component({
  selector: 'app-bank-reconciliation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bank-reconciliation.component.html',
})
export class BankReconciliationComponent implements OnInit {
  private bankReconciliationService = inject(BankReconciliationService);
  private financeService = inject(FinanceService);

  reconciliations = signal<BankReconciliation[]>([]);
  bankAccounts = signal<any[]>([]);
  isLoading = signal(false);
  bankFilter = '';
  showCreate = signal(false);

  newRec: Partial<BankReconciliation> = {
    reconciliationDate: new Date().toISOString().split('T')[0],
    statementBalance: 0,
    bookBalance: 0,
    depositsInTransit: 0,
    outstandingChecks: 0,
    bankCharges: 0,
    interestEarned: 0,
    status: 'draft',
  };

  ngOnInit() {
    this.loadBankAccounts();
    this.loadReconciliations();
  }

  loadBankAccounts() {
    this.financeService.getBanks().subscribe({
      next: (data: any) => this.bankAccounts.set(data),
    });
  }

  loadReconciliations() {
    this.isLoading.set(true);
    this.bankReconciliationService.findAll(this.bankFilter || undefined).subscribe({
      next: (data) => {
        this.reconciliations.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  createReconciliation() {
    this.bankReconciliationService.create(this.newRec).subscribe({
      next: () => {
        this.showCreate.set(false);
        this.newRec = {
          reconciliationDate: new Date().toISOString().split('T')[0],
          statementBalance: 0,
          bookBalance: 0,
          depositsInTransit: 0,
          outstandingChecks: 0,
          bankCharges: 0,
          interestEarned: 0,
          status: 'draft',
        };
        this.loadReconciliations();
      },
    });
  }

  completeReconciliation(id: string) {
    if (confirm('¿Completar esta conciliación?')) {
      this.bankReconciliationService.complete(id).subscribe({
        next: () => this.loadReconciliations(),
      });
    }
  }

  getStatusClass(status: ReconciliationStatus): string {
    const classes = {
      draft: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    };
    return classes[status] || classes.draft;
  }

  getStatusLabel(status: ReconciliationStatus): string {
    const labels = {
      draft: 'Borrador',
      completed: 'Completado',
    };
    return labels[status] || status;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-CU');
  }

  formatNumber(value: number): string {
    return value.toLocaleString('es-CU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
