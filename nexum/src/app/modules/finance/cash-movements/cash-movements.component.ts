import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FinanceService } from '../../../core/services/finance.service';
import { SuppliersService } from '../../../core/services/suppliers.service';
import { CustomerQuickCreateComponent } from '../../../shared/components/quick-create/customer-quick-create.component';
import { SupplierQuickCreateComponent } from '../../../shared/components/quick-create/supplier-quick-create.component';

@Component({
  selector: 'app-cash-movements',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomerQuickCreateComponent, SupplierQuickCreateComponent],
  templateUrl: './cash-movements.component.html',
})
export class CashMovementsComponent implements OnInit {
  private financeService = inject(FinanceService);
  private suppliersService = inject(SuppliersService);
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

  /** Conceptos de Caja - Ingreso: 24, 80 y 81. */
  private static readonly CASH_INCOME_CONCEPTS = ['24', '80', '81'];
  concepts = signal<any[]>([]);
  incomeConcepts = computed(() =>
    this.concepts().filter((c) => CashMovementsComponent.CASH_INCOME_CONCEPTS.includes(c.code)),
  );

  /** Muestra "código — nombre"; los conceptos antiguos en texto libre se muestran tal cual. */
  conceptLabel(value: string | null | undefined): string {
    if (!value) return '-';
    const c = this.concepts().find((x) => x.code === value);
    return c ? `${c.code} — ${c.name}` : value;
  }

  ngOnInit(): void {
    this.loadRegisters();
    this.financeService.getCounterpartConcepts().subscribe({
      next: (data: any) => this.concepts.set(Array.isArray(data) ? data : []),
      error: () => {},
    });
    const parties$ = this.isIncome ? this.financeService.getCustomers() : this.suppliersService.getAll();
    parties$.subscribe({
      next: (data: any) => this.parties.set(Array.isArray(data) ? data : (data?.data ?? data?.items ?? [])),
      error: () => {},
    });
  }

  // ── Buscador de contraparte: clientes en ingresos, proveedores en egresos ──
  parties = signal<any[]>([]);
  partyDrop = signal(false);
  isPartyCreateOpen = signal(false);

  partyName(p: any): string {
    return p?.name || p?.businessName || p?.tradeName || '';
  }

  filteredParties(query: string): any[] {
    const q = (query || '').toLowerCase();
    const list = this.parties();
    return q
      ? list.filter((p) =>
          [this.partyName(p), p.tradeName, p.code, p.supplierCode, p.taxId, p.nit].some((v) => v?.toLowerCase().includes(q)),
        )
      : list;
  }

  partyExists(query: string): boolean {
    const q = (query || '').trim().toLowerCase();
    return this.parties().some((p) => this.partyName(p).toLowerCase() === q);
  }

  selectParty(p: any): void {
    this.form.counterpartyName = this.partyName(p);
    this.partyDrop.set(false);
  }

  onPartyBlur(): void {
    setTimeout(() => this.partyDrop.set(false), 150);
  }

  createPartyInline(): void {
    this.partyDrop.set(false);
    this.isPartyCreateOpen.set(true);
  }

  onPartyCreated(p: any): void {
    this.parties.set([...this.parties(), p]);
    this.selectParty(p);
    this.isPartyCreateOpen.set(false);
    this.showToast(`${this.isIncome ? 'Cliente' : 'Proveedor'} "${this.partyName(p)}" creado`, 'success');
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
