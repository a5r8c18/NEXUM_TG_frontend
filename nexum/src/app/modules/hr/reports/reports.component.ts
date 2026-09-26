import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { PaginationComponent, PaginationConfig } from '../../../shared/components/pagination/pagination.component';
import {
  HrService,
  Employee,
  Department,
  VacationSubmayorRow,
  PayrollCncRow,
  AccreditationRow,
  StaffingRow,
} from '../../../core/services/hr.service';

type ReportTab = 'submayor' | 'empleados' | 'cnc' | 'acreditacion' | 'plantilla';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  template: `
    <div class="p-6 space-y-5">
      @if (toast()) {
        <div class="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border"
             [class.bg-green-50]="toast()?.type === 'success'" [class.text-green-800]="toast()?.type === 'success'" [class.border-green-200]="toast()?.type === 'success'"
             [class.bg-red-50]="toast()?.type === 'error'" [class.text-red-800]="toast()?.type === 'error'" [class.border-red-200]="toast()?.type === 'error'">
          {{ toast()?.message }}
        </div>
      }
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Reportes de Recursos Humanos</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Submayor de vacaciones, salario devengado, acreditación bancaria y plantilla</p>
        </div>
        <button (click)="exportCsv()" class="inline-flex items-center justify-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 transition-colors text-sm font-medium shadow-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/></svg>
          Exportar
        </button>
      </div>

      <!-- Filtros -->
      <div class="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input type="month" [(ngModel)]="filterPeriod" (change)="loadPeriodData()" class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"/>
          <select [(ngModel)]="filterDepartmentId" (change)="onFilterChange()" class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500">
            <option value="">Todas las áreas</option>
            @for (d of departments(); track d.id) { <option [ngValue]="d.id">{{ d.name }}</option> }
          </select>
        </div>
      </div>

      <!-- Pestañas -->
      <div class="border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        <div class="flex gap-1 min-w-max">
          @for (t of tabs; track t.key) {
            <button (click)="setTab(t.key)"
                    class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
                    [class]="activeTab() === t.key
                      ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'">
              {{ t.label }}
            </button>
          }
        </div>
      </div>

      <!-- Tabla -->
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      @if (isLoading()) {
        <div class="flex items-center justify-center py-20">
          <div class="flex flex-col items-center gap-3 text-slate-500">
            <svg class="w-8 h-8 animate-spin text-rose-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <span class="text-sm">Cargando reporte...</span>
          </div>
        </div>
      } @else {
        <div class="overflow-x-auto">

          @if (activeTab() === 'submayor') {
            <table class="w-full text-sm"><thead class="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th rowspan="2" class="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Nombre y Apellidos</th>
                <th rowspan="2" class="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">CI</th>
                <th colspan="2" class="px-4 py-2 text-center font-semibold text-slate-600 dark:text-slate-400 border-b border-l border-slate-200 dark:border-slate-700">Saldo inicial</th>
                <th colspan="2" class="px-4 py-2 text-center font-semibold text-slate-600 dark:text-slate-400 border-b border-l border-slate-200 dark:border-slate-700">Devengado (+)</th>
                <th colspan="2" class="px-4 py-2 text-center font-semibold text-slate-600 dark:text-slate-400 border-b border-l border-slate-200 dark:border-slate-700">Liquidado (−)</th>
                <th colspan="2" class="px-4 py-2 text-center font-semibold text-slate-600 dark:text-slate-400 border-b border-l border-slate-200 dark:border-slate-700">Saldo final</th>
              </tr>
              <tr>
                @for (h of ['Días', 'Importe', 'Días', 'Importe', 'Días', 'Importe', 'Días', 'Importe']; track $index) {
                  <th class="px-4 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 border-l border-slate-100 dark:border-slate-700 first:border-l-0">{{ h }}</th>
                }
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
              @for (r of pagedSubmayor(); track r.documentId || r.employeeName) {
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                    [class.bg-red-50]="r.closingDays < 0 || r.closingAmount < 0"
                    [class.dark:bg-red-900/10]="r.closingDays < 0 || r.closingAmount < 0">
                  <td class="px-4 py-3 font-medium text-slate-900 dark:text-white">{{ r.employeeName }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ r.documentId || '—' }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ r.openingDays | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ r.openingAmount | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ r.accruedDays | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ r.accruedAmount | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ r.settledDays | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ r.settledAmount | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 text-right font-semibold" [class]="(r.closingDays < 0 || r.closingAmount < 0) ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'"
                      [title]="(r.closingDays < 0 || r.closingAmount < 0) ? 'Adelanto de vacaciones: disfrutó más de lo acumulado' : ''">{{ r.closingDays | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 text-right font-semibold" [class]="(r.closingDays < 0 || r.closingAmount < 0) ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'"
                      [title]="(r.closingDays < 0 || r.closingAmount < 0) ? 'Adelanto de vacaciones: disfrutó más de lo acumulado' : ''">{{ r.closingAmount | number:'1.2-2' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="10" class="px-4 py-16 text-center">
                  <p class="text-sm font-medium text-slate-600 dark:text-slate-300">Sin acumulado de vacaciones hasta el período</p>
                  <p class="text-xs text-slate-400 dark:text-slate-500">El saldo se forma con el 9,09 % de los días y salarios de las nóminas contabilizadas (Art. 102)</p>
                </td></tr>
              }
            </tbody></table>
          }

          @if (activeTab() === 'empleados') {
            <table class="w-full text-sm"><thead class="bg-slate-50 dark:bg-slate-900/50"><tr>
              <th class="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Código</th>
              <th class="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Nombre</th>
              <th class="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Cargo</th>
              <th class="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Área</th>
              <th class="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Salario</th>
            </tr></thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
              @for (e of pagedEmployees(); track e.id) {
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td class="px-4 py-3 dark:text-slate-300">{{ e.employeeCode }}</td>
                  <td class="px-4 py-3 font-medium text-slate-900 dark:text-white">{{ e.firstName }} {{ e.lastName }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ e.position || '—' }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ e.departmentName || '—' }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ e.salary | number:'1.2-2' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="px-4 py-16 text-center">
                  <p class="text-sm font-medium text-slate-600 dark:text-slate-300">No hay empleados para el filtro seleccionado</p>
                </td></tr>
              }
            </tbody></table>
          }

          @if (activeTab() === 'cnc') {
            <table class="w-full text-sm"><thead class="bg-slate-50 dark:bg-slate-900/50"><tr>
              <th class="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Empleado</th>
              <th class="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Devengado</th>
              <th class="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Seg. Social (5%)</th>
              <th class="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Impuesto</th>
              <th class="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Neto a Pagar</th>
            </tr></thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
              @for (r of pagedCnc(); track r.employeeName) {
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td class="px-4 py-3 font-medium text-slate-900 dark:text-white">{{ r.employeeName }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ r.grossSalary | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ r.socialSecurity | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ r.taxWithholding | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 text-right font-semibold dark:text-white">{{ r.netSalary | number:'1.2-2' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="px-4 py-16 text-center">
                  <p class="text-sm font-medium text-slate-600 dark:text-slate-300">No hay nómina de salario procesada en el período</p>
                  <p class="text-xs text-slate-400 dark:text-slate-500">El reporte se alimenta de nóminas procesadas o pagadas</p>
                </td></tr>
              }
            </tbody></table>
          }

          @if (activeTab() === 'acreditacion') {
            <table class="w-full text-sm"><thead class="bg-slate-50 dark:bg-slate-900/50"><tr>
              <th class="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">CI</th>
              <th class="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Nombre</th>
              <th class="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Banco</th>
              <th class="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Cuenta</th>
              <th class="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Importe</th>
            </tr></thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
              @for (r of pagedAccreditation(); track r.documentId || r.employeeName) {
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td class="px-4 py-3 dark:text-slate-300">{{ r.documentId || '—' }}</td>
                  <td class="px-4 py-3 font-medium text-slate-900 dark:text-white">{{ r.employeeName }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ r.bankName || '—' }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ r.bankAccount || '—' }}</td>
                  <td class="px-4 py-3 text-right font-semibold dark:text-white">{{ r.amount | number:'1.2-2' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="px-4 py-16 text-center">
                  <p class="text-sm font-medium text-slate-600 dark:text-slate-300">No hay nómina de salario procesada en el período</p>
                  <p class="text-xs text-slate-400 dark:text-slate-500">El fichero se alimenta de nóminas procesadas o pagadas</p>
                </td></tr>
              }
            </tbody></table>
          }

          @if (activeTab() === 'plantilla') {
            <table class="w-full text-sm"><thead class="bg-slate-50 dark:bg-slate-900/50"><tr>
              <th class="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Cargo</th>
              <th class="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Aprobada</th>
              <th class="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Cubierta</th>
              <th class="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Vacantes</th>
              <th class="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Salario Base</th>
            </tr></thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
              @for (r of pagedStaffing(); track r.positionName) {
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td class="px-4 py-3 font-medium text-slate-900 dark:text-white">{{ r.positionName }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ r.approved }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ r.covered }}</td>
                  <td class="px-4 py-3 text-right font-semibold" [class]="r.vacant > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'">{{ r.vacant }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ r.baseSalary | number:'1.2-2' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="px-4 py-16 text-center">
                  <p class="text-sm font-medium text-slate-600 dark:text-slate-300">No hay cargos en la plantilla</p>
                  <p class="text-xs text-slate-400 dark:text-slate-500">Registre cargos en RRHH → Cargos para ver la plantilla</p>
                </td></tr>
              }
            </tbody></table>
          }

        </div>
      }
      </div>

      @if (!isLoading() && paginationConfig().totalPages > 1) {
        <app-pagination [config]="paginationConfig()" (pageChange)="onPageChange($event)" />
      }
    </div>
  `
})
export class ReportsComponent implements OnInit {
  private hrService = inject(HrService);

  tabs: { key: ReportTab; label: string }[] = [
    { key: 'submayor', label: 'Submayor de Vacaciones' },
    { key: 'empleados', label: 'Listado de Empleados' },
    { key: 'cnc', label: 'Salario Devengado (CNC)' },
    { key: 'acreditacion', label: 'Fichero de Acreditación' },
    { key: 'plantilla', label: 'Plantilla Aprobada y Cubierta' },
  ];

  activeTab = signal<ReportTab>('submayor');
  submayorRows = signal<VacationSubmayorRow[]>([]);
  employees = signal<Employee[]>([]);
  cncRows = signal<PayrollCncRow[]>([]);
  accreditationRows = signal<AccreditationRow[]>([]);
  staffingRows = signal<StaffingRow[]>([]);
  departments = signal<Department[]>([]);

  currentPage = signal(1);
  pageSize = 10;
  isLoading = signal(false);
  toast = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  filterPeriod = new Date().toISOString().slice(0, 7);
  filterDepartmentId = '';

  filteredEmployees = computed(() =>
    this.employees().filter(
      (e) => !this.filterDepartmentId || e.departmentId === this.filterDepartmentId,
    ),
  );

  private activeRows = computed<unknown[]>(() => {
    switch (this.activeTab()) {
      case 'submayor': return this.submayorRows();
      case 'empleados': return this.filteredEmployees();
      case 'cnc': return this.cncRows();
      case 'acreditacion': return this.accreditationRows();
      case 'plantilla': return this.staffingRows();
    }
  });

  private paged<T>(rows: T[]): T[] {
    const start = (this.currentPage() - 1) * this.pageSize;
    return rows.slice(start, start + this.pageSize);
  }

  pagedSubmayor = computed(() => this.paged(this.submayorRows()));
  pagedEmployees = computed(() => this.paged(this.filteredEmployees()));
  pagedCnc = computed(() => this.paged(this.cncRows()));
  pagedAccreditation = computed(() => this.paged(this.accreditationRows()));
  pagedStaffing = computed(() => this.paged(this.staffingRows()));

  paginationConfig = computed<PaginationConfig>(() => ({
    currentPage: this.currentPage(),
    totalItems: this.activeRows().length,
    totalPages: Math.ceil(this.activeRows().length / this.pageSize),
    itemsPerPage: this.pageSize,
  }));

  ngOnInit() {
    this.loadStaticData();
    this.loadPeriodData();
  }

  setTab(tab: ReportTab) {
    this.activeTab.set(tab);
    this.currentPage.set(1);
  }

  onPageChange(page: number) { this.currentPage.set(page); }
  onFilterChange() { this.currentPage.set(1); }

  private loadStaticData() {
    this.hrService.getEmployees().subscribe({
      next: (res: any) => this.employees.set(Array.isArray(res) ? res : res?.employees || []),
      error: () => this.showToast('error', 'Error cargando empleados'),
    });
    this.hrService.getDepartments().subscribe({
      next: (res: any) => this.departments.set(Array.isArray(res) ? res : res?.departments || []),
      error: () => this.showToast('error', 'Error cargando áreas'),
    });
    this.hrService.getStaffingReport().subscribe({
      next: (rows) => this.staffingRows.set(rows || []),
      error: () => this.showToast('error', 'Error cargando la plantilla'),
    });
  }

  loadPeriodData() {
    this.currentPage.set(1);
    this.isLoading.set(true);
    forkJoin({
      submayor: this.hrService.getVacationSubmayor(this.filterPeriod),
      cnc: this.hrService.getPayrollCNC(this.filterPeriod),
      accreditation: this.hrService.getAccreditationFile(this.filterPeriod),
    }).subscribe({
      next: (res) => {
        this.submayorRows.set(res.submayor || []);
        this.cncRows.set(res.cnc || []);
        this.accreditationRows.set(res.accreditation || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.showToast('error', 'Error cargando los reportes del período');
      },
    });
  }

  /** Exporta la pestaña activa a CSV (se abre en Excel). */
  exportCsv() {
    const [headers, rows] = this.currentTable();
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_${this.activeTab()}_${this.filterPeriod}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private currentTable(): [string[], (string | number)[][]] {
    const money = (n: number) => n.toFixed(2);
    switch (this.activeTab()) {
      case 'submayor':
        return [
          ['Nombre y Apellidos', 'CI', 'Saldo Inicial Días', 'Saldo Inicial Importe', 'Devengado Días', 'Devengado Importe', 'Liquidado Días', 'Liquidado Importe', 'Saldo Final Días', 'Saldo Final Importe'],
          this.submayorRows().map((r) => [
            r.employeeName,
            r.documentId || '',
            r.openingDays,
            money(r.openingAmount),
            r.accruedDays,
            money(r.accruedAmount),
            r.settledDays,
            money(r.settledAmount),
            r.closingDays,
            money(r.closingAmount),
          ]),
        ];
      case 'empleados':
        return [
          ['Código', 'Nombre', 'Cargo', 'Área', 'Salario'],
          this.filteredEmployees().map((e) => [e.employeeCode, `${e.firstName} ${e.lastName}`, e.position || '', e.departmentName || '', money(Number(e.salary || 0))]),
        ];
      case 'cnc':
        return [
          ['Empleado', 'Devengado', 'Seg. Social (5%)', 'Impuesto', 'Neto a Pagar'],
          this.cncRows().map((r) => [r.employeeName, money(r.grossSalary), money(r.socialSecurity), money(r.taxWithholding), money(r.netSalary)]),
        ];
      case 'acreditacion':
        return [
          ['CI', 'Nombre', 'Banco', 'Cuenta', 'Importe'],
          this.accreditationRows().map((r) => [r.documentId || '', r.employeeName, r.bankName || '', r.bankAccount || '', money(r.amount)]),
        ];
      case 'plantilla':
        return [
          ['Cargo', 'Aprobada', 'Cubierta', 'Vacantes', 'Salario Base'],
          this.staffingRows().map((r) => [r.positionName, r.approved, r.covered, r.vacant, money(r.baseSalary)]),
        ];
    }
  }

  private showToast(type: 'success' | 'error', message: string) {
    this.toast.set({ type, message });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
