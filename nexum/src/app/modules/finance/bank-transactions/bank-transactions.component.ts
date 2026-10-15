import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FinanceService } from '../../../core/services/finance.service';

@Component({
  selector: 'app-bank-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bank-transactions.component.html',
})
export class BankTransactionsComponent implements OnInit {
  private financeService = inject(FinanceService);
  private route = inject(ActivatedRoute);

  type = this.route.snapshot.data['type'] as 'income' | 'expense';
  isIncome = this.type === 'income';
  transactionType = this.isIncome ? 'credit' : 'debit';
  pageTitle = this.isIncome ? 'Banco - Ingreso' : 'Banco - Egreso';

  banks = signal<any[]>([]);
  selectedBankId = signal<string>('');
  transactions = signal<any[]>([]);
  isLoading = signal(false);
  saving = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);

  form = {
    transactionDate: new Date().toISOString().split('T')[0],
    amount: 0,
    description: '',
    counterpartyName: '',
    referenceNumber: '',
    category: '',
  };

  selectedBank = computed(() => this.banks().find(b => b.id === this.selectedBankId()) || null);

  ngOnInit(): void {
    this.loadBanks();
  }

  loadBanks(): void {
    this.isLoading.set(true);
    this.financeService.getBanks().subscribe({
      next: (data) => {
        this.banks.set(Array.isArray(data) ? data : []);
        this.isLoading.set(false);
        if (this.banks().length > 0 && !this.selectedBankId()) {
          this.selectedBankId.set(this.banks()[0].id);
          this.loadTransactions();
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.showToast('Error cargando cuentas bancarias', 'error');
      },
    });
  }

  loadTransactions(): void {
    const id = this.selectedBankId();
    if (!id) return;
    this.isLoading.set(true);
    this.financeService.getBankTransactions(id, { type: this.transactionType }).subscribe({
      next: (data) => {
        this.transactions.set(Array.isArray(data) ? data : []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.showToast('Error cargando transacciones', 'error');
      },
    });
  }

  onBankChange(): void {
    this.loadTransactions();
  }

  submit(): void {
    const id = this.selectedBankId();
    if (!id) return;
    if (!this.form.description?.trim() || !this.form.amount || Number(this.form.amount) <= 0) {
      this.showToast('Monto y descripción son obligatorios', 'error');
      return;
    }

    this.saving.set(true);
    this.financeService.createBankTransaction(id, {
      transactionType: this.transactionType,
      transactionDate: this.form.transactionDate,
      amount: Number(this.form.amount),
      description: this.form.description,
      counterpartyName: this.form.counterpartyName || undefined,
      referenceNumber: this.form.referenceNumber || undefined,
      category: this.form.category || undefined,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.showToast(this.isIncome ? 'Ingreso registrado' : 'Egreso registrado', 'success');
        this.resetForm();
        this.loadTransactions();
      },
      error: (err) => {
        this.saving.set(false);
        this.showToast(err?.error?.message || 'Error guardando la transacción', 'error');
      },
    });
  }

  resetForm(): void {
    this.form = {
      transactionDate: new Date().toISOString().split('T')[0],
      amount: 0,
      description: '',
      counterpartyName: '',
      referenceNumber: '',
      category: '',
    };
  }

  showToast(message: string, type: 'success' | 'error'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }

  formatCurrency(value: number): string {
    return Number(value || 0).toLocaleString('es-CU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
