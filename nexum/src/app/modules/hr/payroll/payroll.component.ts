import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PayrollService } from '../../../core/services/payroll.service';
import { AccountingService, CostCenter } from '../../../core/services/accounting.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  template: `
    <div class="p-6">
      @if (toast()) {
        <div class="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border"
             [class.bg-green-50]="toast()!.type === 'success'"
             [class.text-green-800]="toast()!.type === 'success'"
             [class.border-green-200]="toast()!.type === 'success'"
             [class.bg-red-50]="toast()!.type === 'error'"
             [class.text-red-800]="toast()!.type === 'error'"
             [class.border-red-200]="toast()!.type === 'error'">
          {{ toast()!.message }}
        </div>
      }

      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold dark:text-white">Nómina</h1>
        <button (click)="openGenerate()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">+ Generar Nómina</button>
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
                  <td class="px-4 py-3 dark:text-slate-300 font-mono text-xs">{{ payroll.id }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ payroll.period }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ payroll.paidAt || '—' }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ payroll.totalGross | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 text-right font-semibold dark:text-white">{{ payroll.totalNet | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ (payroll.items?.length) || 0 }}</td>
                  <td class="px-4 py-3 text-center">
                    <span [class]="getStatusClass(payroll.status)" class="px-2 py-1 rounded-full text-xs font-medium">{{ getStatusLabel(payroll.status) }}</span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    @if (payroll.status === 'draft') {
                      <button (click)="openProcess(payroll)" class="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors mr-1">Procesar</button>
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

      <!-- Modal Generar Nómina -->
      @if (showGenerate()) {
        <app-modal [isOpen]="showGenerate()" (closeEvent)="showGenerate.set(false)" (confirmEvent)="generate()"
                   title="Generar Nómina"
                   [confirmText]="isBusy() ? 'Generando...' : 'Generar'"
                   confirmButtonClass="bg-blue-600 hover:bg-blue-700"
                   maxWidthClass="max-w-md">
          <div class="space-y-4">
            <p class="text-xs text-slate-500">Se generará un borrador con todos los empleados activos, tomando su salario contractual y aplicando la Contribución Especial a la Seguridad Social (5%).</p>
            <div class="space-y-1">
              <label class="text-xs font-medium text-slate-600">Período <span class="text-red-500">*</span></label>
              <input type="month" [(ngModel)]="genForm.period"
                     class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <label class="text-xs font-medium text-slate-600">Fecha inicio <span class="text-red-500">*</span></label>
                <input type="date" [(ngModel)]="genForm.startDate"
                       class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div class="space-y-1">
                <label class="text-xs font-medium text-slate-600">Fecha fin <span class="text-red-500">*</span></label>
                <input type="date" [(ngModel)]="genForm.endDate"
                       class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            </div>
          </div>
        </app-modal>
      }

      <!-- Modal Procesar Nómina -->
      @if (showProcess()) {
        <app-modal [isOpen]="showProcess()" (closeEvent)="showProcess.set(false)" (confirmEvent)="confirmProcess()"
                   title="Procesar Nómina"
                   [confirmText]="isBusy() ? 'Procesando...' : 'Procesar'"
                   confirmButtonClass="bg-blue-600 hover:bg-blue-700"
                   maxWidthClass="max-w-md">
          <div class="space-y-4">
            <p class="text-xs text-slate-500">Al procesar se genera el asiento contable del devengo (gasto de salario contra nóminas por pagar y retenciones).</p>
            <div class="space-y-1">
              <label class="text-xs font-medium text-slate-600">Centro de costo (opcional)</label>
              <select [(ngModel)]="selectedCostCenterId"
                      class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option [ngValue]="null">Sin centro de costo</option>
                @for (cc of costCenters(); track cc.id) {
                  <option [ngValue]="cc.id">{{ cc.code }} - {{ cc.name }}</option>
                }
              </select>
            </div>
          </div>
        </app-modal>
      }
    </div>
  `
})
export class PayrollComponent implements OnInit {
  private payrollService = inject(PayrollService);
  private accountingService = inject(AccountingService);
  private confirmDialog = inject(ConfirmDialogService);

  items = signal<any[]>([]);
  isLoading = signal(false);
  isBusy = signal(false);
  showGenerate = signal(false);
  showProcess = signal(false);
  costCenters = signal<CostCenter[]>([]);
  toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);

  statusFilter = '';
  periodFilter = '';
  fromDate = '';
  toDate = '';

  genForm: { period: string; startDate: string; endDate: string } = { period: '', startDate: '', endDate: '' };
  processingId: number | null = null;
  selectedCostCenterId: string | null = null;

  ngOnInit() {
    this.loadData();
    this.accountingService.getCostCenters({ activeOnly: 'true' }).subscribe({
      next: (data) => this.costCenters.set(data),
      error: () => { /* centros de costo opcionales */ }
    });
  }

  loadData() {
    this.isLoading.set(true);
    this.payrollService.getAll({
      status: this.statusFilter || undefined,
      period: this.periodFilter || undefined,
      startDate: this.fromDate || undefined,
      endDate: this.toDate || undefined,
    }).subscribe({
      next: (data) => { this.items.set(data?.payrolls || []); this.isLoading.set(false); },
      error: () => { this.isLoading.set(false); this.showToast('Error al cargar nóminas', 'error'); },
    });
  }

  openGenerate() {
    this.genForm = { period: '', startDate: '', endDate: '' };
    this.showGenerate.set(true);
  }

  generate() {
    if (!this.genForm.period || !this.genForm.startDate || !this.genForm.endDate) {
      this.showToast('Período y fechas son obligatorios', 'error');
      return;
    }
    this.isBusy.set(true);
    this.payrollService.generate(this.genForm).subscribe({
      next: () => {
        this.isBusy.set(false);
        this.showGenerate.set(false);
        this.showToast('Nómina generada en borrador', 'success');
        this.loadData();
      },
      error: (err) => {
        this.isBusy.set(false);
        this.showToast(err?.error?.message || 'Error al generar la nómina', 'error');
      }
    });
  }

  openProcess(payroll: any) {
    this.processingId = payroll.id;
    this.selectedCostCenterId = null;
    this.showProcess.set(true);
  }

  confirmProcess() {
    if (this.processingId == null) return;
    this.isBusy.set(true);
    this.payrollService.process(this.processingId, 'system', this.selectedCostCenterId || undefined).subscribe({
      next: () => {
        this.isBusy.set(false);
        this.showProcess.set(false);
        this.showToast('Nómina procesada y contabilizada', 'success');
        this.loadData();
      },
      error: (err) => {
        this.isBusy.set(false);
        this.showToast(err?.error?.message || 'Error al procesar la nómina', 'error');
      }
    });
  }

  async markAsPaid(id: number) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Marcar como pagada',
      message: '¿Registrar el pago de esta nómina? Se generará el asiento de pago.',
      confirmText: 'Pagar',
      type: 'info'
    });
    if (!confirmed) return;
    this.payrollService.markAsPaid(id).subscribe({
      next: () => { this.showToast('Nómina marcada como pagada', 'success'); this.loadData(); },
      error: (err) => this.showToast(err?.error?.message || 'Error al pagar la nómina', 'error')
    });
  }

  async cancel(id: number) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Cancelar nómina',
      message: '¿Cancelar esta nómina? Se anularán los comprobantes contables asociados.',
      confirmText: 'Cancelar nómina',
      type: 'danger'
    });
    if (!confirmed) return;
    this.payrollService.cancel(id).subscribe({
      next: () => { this.showToast('Nómina cancelada y comprobantes anulados', 'success'); this.loadData(); },
      error: (err) => this.showToast(err?.error?.message || 'Error al cancelar la nómina', 'error')
    });
  }

  private showToast(message: string, type: 'success' | 'error') {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3000);
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
