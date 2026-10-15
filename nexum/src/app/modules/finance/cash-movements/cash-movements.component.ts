import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FinanceService } from '../../../core/services/finance.service';

@Component({
  selector: 'app-cash-movements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cash-movements.component.html',
})
export class CashMovementsComponent implements OnInit {
  private financeService = inject(FinanceService);
  private route = inject(ActivatedRoute);

  type = this.route.snapshot.data['type'] as 'income' | 'expense';
  isIncome = this.type === 'income';
  pageTitle = this.isIncome ? 'Caja - Ingreso' : 'Caja - Egreso';

  registers = signal<any[]>([]);
  selectedRegisterId = signal<string>('');
  movements = signal<any[]>([]);
  isLoading = signal(false);
  saving = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);

  form = {
    movementDate: new Date().toISOString().split('T')[0],
    amount: 0,
    description: '',
    counterpartyName: '',
    concept: '',
  };

  selectedRegister = computed(() => this.registers().find(r => r.id === this.selectedRegisterId()) || null);

  ngOnInit(): void {
    this.loadRegisters();
  }

  loadRegisters(): void {
    this.isLoading.set(true);
    this.financeService.getCashRegisters().subscribe({
      next: (data) => {
        this.registers.set(Array.isArray(data) ? data : []);
        this.isLoading.set(false);
        if (this.registers().length > 0 && !this.selectedRegisterId()) {
          this.selectedRegisterId.set(this.registers()[0].id);
          this.loadMovements();
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.showToast('Error cargando cajas', 'error');
      },
    });
  }

  loadMovements(): void {
    const id = this.selectedRegisterId();
    if (!id) return;
    this.isLoading.set(true);
    this.financeService.getCashMovements(id, { movementType: this.type }).subscribe({
      next: (data) => {
        this.movements.set(Array.isArray(data) ? data : []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.showToast('Error cargando movimientos', 'error');
      },
    });
  }

  onRegisterChange(): void {
    this.loadMovements();
  }

  submit(): void {
    const id = this.selectedRegisterId();
    if (!id) return;
    if (!this.form.description?.trim() || !this.form.amount || Number(this.form.amount) <= 0) {
      this.showToast('Monto y descripción son obligatorios', 'error');
      return;
    }

    this.saving.set(true);
    this.financeService.createCashMovement(id, {
      movementType: this.type,
      movementDate: this.form.movementDate,
      amount: Number(this.form.amount),
      description: this.form.description,
      counterpartyName: this.form.counterpartyName || undefined,
      concept: this.form.concept || undefined,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.showToast(this.isIncome ? 'Ingreso registrado' : 'Egreso registrado', 'success');
        this.resetForm();
        this.loadMovements();
      },
      error: (err) => {
        this.saving.set(false);
        this.showToast(err?.error?.message || 'Error guardando el movimiento', 'error');
      },
    });
  }

  resetForm(): void {
    this.form = {
      movementDate: new Date().toISOString().split('T')[0],
      amount: 0,
      description: '',
      counterpartyName: '',
      concept: '',
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
