import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PayrollService } from '../../../core/services/payroll.service';
import { AccountingService, CostCenter } from '../../../core/services/accounting.service';
import { FinanceService } from '../../../core/services/finance.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaginationComponent, PaginationConfig } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, PaginationComponent],
  template: `
    <div class="p-6">
      @if (toast()) {
        <div class="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border"
             [class.bg-green-50]="toast()?.type === 'success'"
             [class.text-green-800]="toast()?.type === 'success'"
             [class.border-green-200]="toast()?.type === 'success'"
             [class.bg-red-50]="toast()?.type === 'error'"
             [class.text-red-800]="toast()?.type === 'error'"
             [class.border-red-200]="toast()?.type === 'error'">
          {{ toast()?.message }}
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
        <div class="flex items-center justify-center py-20">
          <div class="flex flex-col items-center gap-3 text-slate-500">
            <svg class="w-8 h-8 animate-spin text-violet-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <span class="text-sm">Cargando nóminas...</span>
          </div>
        </div>
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
              @for (payroll of pagedItems(); track payroll.id) {
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
                    <button (click)="openDetail(payroll)" class="bg-slate-600 text-white px-3 py-1 rounded text-xs hover:bg-slate-700 transition-colors mr-1">Detalle</button>
                    @if (payroll.status === 'draft') {
                      <button (click)="openProcess(payroll)" class="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors mr-1">Procesar</button>
                    }
                    @if (payroll.status === 'processed') {
                      <button (click)="openPay(payroll.id)" class="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition-colors mr-1">Marcar Pagada</button>
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

        @if (paginationConfig().totalPages > 1) {
          <div class="mt-6">
            <app-pagination [config]="paginationConfig()" (pageChange)="onPageChange($event)" />
          </div>
        }
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

      <!-- Modal Detalle / Editar Líneas -->
      @if (showDetail()) {
        <app-modal [isOpen]="showDetail()" (closeEvent)="showDetail.set(false)" (confirmEvent)="saveItems()"
                   title="Líneas de Nómina" [confirmText]="isBusy() ? 'Guardando...' : 'Guardar cambios'"
                   confirmButtonClass="bg-blue-600 hover:bg-blue-700" maxWidthClass="max-w-4xl">
          <div class="space-y-4">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-slate-50 border-b border-slate-200"><tr>
                  <th class="text-left px-3 py-2 font-medium text-slate-700">Empleado</th>
                  <th class="text-right px-3 py-2 font-medium text-slate-700">Salario base</th>
                  <th class="text-right px-3 py-2 font-medium text-slate-700">Horas extra</th>
                  <th class="text-right px-3 py-2 font-medium text-slate-700">Otros ingresos</th>
                  <th class="text-right px-3 py-2 font-medium text-slate-700">Retenciones</th>
                  <th class="text-right px-3 py-2 font-medium text-slate-700">Seguridad Social</th>
                  <th class="text-right px-3 py-2 font-medium text-slate-700">Neto</th>
                  <th class="text-center px-3 py-2 font-medium text-slate-700">Recibo</th>
                </tr></thead>
                <tbody class="divide-y divide-slate-200">
                  @for (item of detailItems(); track item.id) {
                    <tr>
                      <td class="px-3 py-2 text-slate-700">{{ item.employeeName }}</td>
                      <td class="px-3 py-2"><input type="number" [(ngModel)]="item.baseSalary" (ngModelChange)="recalcItem(item)" class="w-24 px-2 py-1 border rounded text-right text-xs"/></td>
                      <td class="px-3 py-2"><input type="number" [(ngModel)]="item.overtimePay" (ngModelChange)="recalcItem(item)" class="w-24 px-2 py-1 border rounded text-right text-xs"/></td>
                      <td class="px-3 py-2"><input type="number" [(ngModel)]="item.otherIncome" (ngModelChange)="recalcItem(item)" class="w-24 px-2 py-1 border rounded text-right text-xs"/></td>
                      <td class="px-3 py-2"><input type="number" [(ngModel)]="item.deductions" (ngModelChange)="recalcItem(item)" class="w-24 px-2 py-1 border rounded text-right text-xs"/></td>
                      <td class="px-3 py-2"><input type="number" [(ngModel)]="item.socialSecurity" (ngModelChange)="recalcItem(item)" class="w-24 px-2 py-1 border rounded text-right text-xs"/></td>
                      <td class="px-3 py-2 text-right font-semibold text-xs">{{ item.netSalary | number:'1.2-2' }}</td>
                      <td class="px-3 py-2 text-center"><button (click)="openReceipt(item)" class="text-blue-600 hover:text-blue-800 text-xs">🖨️</button></td>
                    </tr>
                  } @empty {
                    <tr><td colspan="8" class="px-3 py-4 text-center text-slate-500">No hay líneas</td></tr>
                  }
                </tbody>
              </table>
            </div>
            <p class="text-xs text-slate-500">* La edición solo está disponible en estado borrador. En estados procesados/pagados use cancelar.</p>
          </div>
        </app-modal>
      }

      <!-- Modal Recibo -->
      @if (showReceipt() && receiptItem()) {
        <app-modal [isOpen]="showReceipt()" (closeEvent)="showReceipt.set(false)" (confirmEvent)="printReceipt()"
                   title="Recibo de Pago" confirmText="Imprimir" confirmButtonClass="bg-blue-600 hover:bg-blue-700" maxWidthClass="max-w-lg">
          <div id="receipt" class="p-4 border rounded-xl bg-white space-y-2 text-sm">
            <div class="text-center border-b pb-2"><h3 class="font-bold text-lg">RECIBO DE PAGO</h3><p class="text-xs text-slate-500">Período: {{ detailPayroll()?.period }}</p></div>
            <p><strong>Empleado:</strong> {{ receiptItem()?.employeeName }}</p>
            <p><strong>Salario base:</strong> {{ receiptItem()?.baseSalary | number:'1.2-2' }}</p>
            <p><strong>Horas extra:</strong> {{ receiptItem()?.overtimePay | number:'1.2-2' }}</p>
            <p><strong>Otros ingresos:</strong> {{ receiptItem()?.otherIncome | number:'1.2-2' }}</p>
            <p><strong>Retenciones:</strong> {{ receiptItem()?.deductions | number:'1.2-2' }}</p>
            <p><strong>Seguridad Social:</strong> {{ receiptItem()?.socialSecurity | number:'1.2-2' }}</p>
            <p class="text-lg font-bold text-right border-t pt-2">NETO: {{ receiptItem()?.netSalary | number:'1.2-2' }}</p>
            <p class="text-xs text-slate-400 text-center">Generado por NEXUM TG</p>
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

      <!-- Modal Pagar Nómina -->
      @if (showPay()) {
        <app-modal [isOpen]="showPay()" (closeEvent)="showPay.set(false)" (confirmEvent)="confirmPay()"
                   title="Registrar Pago de Nómina"
                   [confirmText]="isBusy() ? 'Pagando...' : 'Pagar'"
                   confirmButtonClass="bg-green-600 hover:bg-green-700"
                   maxWidthClass="max-w-md">
          <div class="space-y-4">
            <p class="text-xs text-slate-500">Al pagar se genera el asiento contable (nóminas por pagar contra tesorería). Si selecciona una cuenta bancaria, el saldo del banco en Finanzas se actualizará automáticamente.</p>
            <div class="space-y-1">
              <label class="text-xs font-medium text-slate-600">Cuenta bancaria (opcional)</label>
              <select [(ngModel)]="selectedBankAccountId"
                      class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500">
                <option [ngValue]="null">Sin cuenta bancaria (solo asiento contable)</option>
                @for (b of banks(); track b.id) {
                  <option [ngValue]="b.id">{{ b.bankName }} - {{ b.accountNumber }} ({{ b.balance | number:'1.2-2' }})</option>
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
  private financeService = inject(FinanceService);
  private confirmDialog = inject(ConfirmDialogService);

  items = signal<any[]>([]);
  currentPage = signal(1);
  pageSize = 10;
  isLoading = signal(false);
  isBusy = signal(false);
  showGenerate = signal(false);
  showProcess = signal(false);
  showDetail = signal(false);
  showReceipt = signal(false);
  showPay = signal(false);
  costCenters = signal<CostCenter[]>([]);
  banks = signal<any[]>([]);
  toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);
  detailPayroll = signal<any>(null);
  detailItems = signal<any[]>([]);
  receiptItem = signal<any>(null);

  statusFilter = '';
  periodFilter = '';
  fromDate = '';
  toDate = '';

  pagedItems = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.items().slice(start, start + this.pageSize);
  });

  paginationConfig = computed<PaginationConfig>(() => ({
    currentPage: this.currentPage(),
    totalItems: this.items().length,
    totalPages: Math.ceil(this.items().length / this.pageSize),
    itemsPerPage: this.pageSize,
  }));

  onPageChange(page: number) { this.currentPage.set(page); }

  genForm: { period: string; startDate: string; endDate: string } = { period: '', startDate: '', endDate: '' };
  processingId: number | null = null;
  selectedCostCenterId: string | null = null;
  payingId: number | null = null;
  selectedBankAccountId: string | null = null;

  ngOnInit() {
    this.loadData();
    this.accountingService.getCostCenters({ activeOnly: 'true' }).subscribe({
      next: (data) => this.costCenters.set(data),
      error: () => { /* centros de costo opcionales */ }
    });
    this.financeService.getBanks({ status: 'active' }).subscribe({
      next: (data) => this.banks.set(data || []),
      error: () => { /* cuentas bancarias opcionales */ }
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
      next: (data) => { this.items.set(data?.payrolls || []); this.currentPage.set(1); this.isLoading.set(false); },
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

  openDetail(payroll: any) {
    this.detailPayroll.set(payroll);
    this.detailItems.set((payroll.items || []).map((i: any) => ({ ...i })));
    this.showDetail.set(true);
  }

  recalcItem(item: any) {
    item.baseSalary = Number(item.baseSalary) || 0;
    item.overtimePay = Number(item.overtimePay) || 0;
    item.otherIncome = Number(item.otherIncome) || 0;
    item.deductions = Number(item.deductions) || 0;
    item.socialSecurity = Number(item.socialSecurity) || 0;
    item.grossSalary = item.baseSalary + item.overtimePay + item.otherIncome;
    item.netSalary = item.grossSalary - item.deductions - item.socialSecurity;
    this.detailItems.set([...this.detailItems()]);
  }

  saveItems() {
    const payroll = this.detailPayroll();
    if (!payroll) return;
    if (payroll.status !== 'draft') { this.showToast('Solo se editan líneas en borrador', 'error'); return; }
    this.isBusy.set(true);
    this.payrollService.updateItems(payroll.id, this.detailItems()).subscribe({
      next: () => {
        this.isBusy.set(false);
        this.showDetail.set(false);
        this.showToast('Líneas actualizadas', 'success');
        this.loadData();
      },
      error: (err: any) => { this.isBusy.set(false); this.showToast(err?.error?.message || 'Error actualizando líneas', 'error'); }
    });
  }

  openReceipt(item: any) {
    this.receiptItem.set(item);
    this.showReceipt.set(true);
  }

  printReceipt() {
    const content = document.getElementById('receipt');
    if (!content) return;
    const printWindow = window.open('', '_blank', 'width=600,height=400');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Recibo</title></head><body>' + content.innerHTML + '</body></html>');
      printWindow.document.close();
      printWindow.print();
    }
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

  openPay(id: number) {
    this.payingId = id;
    this.selectedBankAccountId = null;
    this.showPay.set(true);
  }

  confirmPay() {
    if (this.payingId == null) return;
    this.isBusy.set(true);
    this.payrollService.markAsPaid(this.payingId, this.selectedBankAccountId || undefined).subscribe({
      next: () => {
        this.isBusy.set(false);
        this.showPay.set(false);
        this.showToast('Nómina marcada como pagada', 'success');
        this.loadData();
      },
      error: (err) => {
        this.isBusy.set(false);
        this.showToast(err?.error?.message || 'Error al pagar la nómina', 'error');
      }
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
