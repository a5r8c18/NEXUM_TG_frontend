import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PayrollService } from '../../../core/services/payroll.service';
import { HrService, Employee } from '../../../core/services/hr.service';
import { FinanceService } from '../../../core/services/finance.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaginationComponent, PaginationConfig } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, PaginationComponent],
  template: `
    <div class="p-6 space-y-5">
      @if (toast()) {
        <div class="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border max-w-md"
             [class.bg-green-50]="toast()?.type === 'success'"
             [class.text-green-800]="toast()?.type === 'success'"
             [class.border-green-200]="toast()?.type === 'success'"
             [class.bg-red-50]="toast()?.type === 'error'"
             [class.text-red-800]="toast()?.type === 'error'"
             [class.border-red-200]="toast()?.type === 'error'"
             [class.bg-amber-50]="toast()?.type === 'warning'"
             [class.text-amber-800]="toast()?.type === 'warning'"
             [class.border-amber-200]="toast()?.type === 'warning'">
          {{ toast()?.message }}
        </div>
      }

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Nómina</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Devengo, retenciones y pago por concepto, contabilizado automáticamente</p>
        </div>
        <button (click)="openGenerate()" class="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Generar Nómina
        </button>
      </div>

      <!-- Stats -->
      @if (stats()) {
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
            <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Nóminas</p>
            <p class="text-2xl font-bold text-slate-900 dark:text-white mt-1">{{ stats().totalPayrolls || 0 }}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">{{ stats().totalDraft || 0 }} en borrador</p>
          </div>
          <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
            <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Devengado acumulado</p>
            <p class="text-2xl font-bold text-slate-900 dark:text-white mt-1">{{ stats().totalGrossAmount | number:'1.2-2' }}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Año en curso: {{ stats().currentYearGross | number:'1.2-2' }}</p>
          </div>
          <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
            <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Neto a pagar</p>
            <p class="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{{ stats().totalNetAmount | number:'1.2-2' }}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">{{ stats().totalPaid || 0 }} pagadas</p>
          </div>
          <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
            <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Pendientes de pago</p>
            <p class="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{{ stats().totalProcessed || 0 }}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Procesadas sin liquidar</p>
          </div>
        </div>
      }

      <!-- Filtros -->
      <div class="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <select [(ngModel)]="conceptFilter" (ngModelChange)="loadData()" class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos los conceptos</option>
            @for (c of concepts; track c.value) {
              <option [value]="c.value">{{ c.label }}</option>
            }
          </select>
          <select [(ngModel)]="statusFilter" (ngModelChange)="loadData()" class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="processed">Procesada</option>
            <option value="paid">Pagada</option>
            <option value="cancelled">Cancelada</option>
          </select>
          <select [(ngModel)]="periodFilter" (ngModelChange)="loadData()" class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos los períodos</option>
            @for (p of periodOptions; track p.value) {
              <option [value]="p.value">{{ p.label }}</option>
            }
          </select>
          <input type="date" [(ngModel)]="fromDate" (ngModelChange)="loadData()" title="Desde" class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="date" [(ngModel)]="toDate" (ngModelChange)="loadData()" title="Hasta" class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        @if (hasActiveFilters()) {
          <div class="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <span class="text-xs text-slate-500 dark:text-slate-400">{{ items().length }} nómina(s) coinciden con los filtros</span>
            <button (click)="resetFilters()" class="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">Limpiar filtros</button>
          </div>
        }
      </div>

      <!-- Tabla -->
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      @if (isLoading()) {
        <div class="flex items-center justify-center py-20">
          <div class="flex flex-col items-center gap-3 text-slate-500">
            <svg class="w-8 h-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            </svg>
            <span class="text-sm">Cargando nóminas...</span>
          </div>
        </div>
      } @else {
        <div class='space-y-3'>
          @for (payroll of pagedItems(); track payroll.id) {
            @let s = payrollSummary(payroll);
            <div class='bg-white dark:bg-slate-800 rounded-md shadow-sm overflow-hidden border-t-4 border-slate-200 dark:border-slate-600'>
              <div class='flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700'>
                <span class='bg-sky-500 text-white text-sm font-medium px-3 py-1 rounded'>NO{{ payroll.id }}</span>
                <span class='text-sm text-slate-700 dark:text-slate-300'><span class='font-semibold'>Fecha:</span> {{ payroll.endDate }}</span>
                <span class='text-sm text-slate-700 dark:text-slate-300'><span class='font-semibold'>Nómina:</span> {{ getConceptLabel(payroll.concept) }}{{ payroll.concept === 'maternidad' && payroll.installment ? (payroll.installment === 4 ? ' · Prestación social' : ' · Plazo ' + payroll.installment) : '' }}@if (payroll.items?.length === 1 && isSingleConcept(payroll.concept)) { · {{ payroll.items[0].employeeName }} }</span>
                <span class='text-sm text-slate-700 dark:text-slate-300'><span class='font-semibold'>Personas:</span> {{ (payroll.items?.length) || 0 }}</span>
                <div class='flex items-center gap-1 ml-auto'>
                  <button (click)='openDetail(payroll)' title='Ver líneas' class='p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors'>
                    <svg class='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'/><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'/></svg>
                  </button>
                  <button (click)='openPdfModal(payroll)' title='Descargar Modelo SC-4-06' class='p-1.5 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-lg transition-colors'>
                    <svg class='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h5.586a1 1 0 01.707.293l1.414 1.414a1 1 0 00.707.293H19a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z'/></svg>
                  </button>
                  @if (payroll.status === 'draft') {
                    <button (click)='processPayroll(payroll)' class='px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors'>Procesar</button>
                  }
                  @if (payroll.status === 'processed') {
                    <button (click)='openPay(payroll.id)' class='px-2.5 py-1 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors'>Pagar</button>
                  }
                  @if (['draft', 'processed'].includes(payroll.status)) {
                    <button (click)='cancel(payroll.id)' title='Cancelar y anular comprobantes' class='p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors'>
                      <svg class='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'/></svg>
                    </button>
                  }
                </div>
              </div>
              <div class='grid grid-cols-6 gap-2 px-4 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 border-t border-slate-100 dark:border-slate-700'>
                <div>Salario</div>
                <div>Vacaciones</div>
                <div>Impuesto s/ ingresos personales</div>
                <div>Contribución esp. seguridad social</div>
                <div>A cobrar</div>
                <div class='text-right pr-6'>Importe Vacaciones acumuladas</div>
              </div>
              <div class='grid grid-cols-6 gap-2 px-4 py-2 text-sm text-slate-800 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/30'>
                <div>{{ s.salary | number:'1.2-2' }}</div>
                <div>{{ s.vacation | number:'1.2-2' }}</div>
                <div>{{ s.incomeTax | number:'1.2-2' }}</div>
                <div>{{ s.specialSS | number:'1.2-2' }}</div>
                <div>{{ s.toPay | number:'1.2-2' }}</div>
                <div class='text-right pr-6'>{{ s.vacationAccumulated | number:'1.2-2' }}</div>
              </div>
              <div class='grid grid-cols-4 gap-2 px-4 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 border-t border-slate-100 dark:border-slate-700'>
                <div>Contribución SS (14%)</div>
                <div>Aporte (12.5%)</div>
                <div>Provisiones (1.5%)</div>
                <div class='text-right pr-6'>Imp. uso fuerza de trabajo (5%)</div>
              </div>
              <div class='grid grid-cols-4 gap-2 px-4 py-2 text-sm text-slate-800 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/30'>
                <div>{{ s.employerSS14 | number:'1.2-2' }}</div>
                <div>{{ s.aporte125 | number:'1.2-2' }}</div>
                <div>{{ s.provisions15 | number:'1.2-2' }}</div>
                <div class='text-right pr-6'>{{ s.laborForceTax5 | number:'1.2-2' }}</div>
              </div>
              <div class='px-4 py-3 border-t border-slate-100 dark:border-slate-700'>
                <div class='font-semibold text-slate-800 dark:text-slate-200'>Notas</div>
                <div class='text-sm text-slate-700 dark:text-slate-400'>{{ payroll.notes || 'Nómina de ' + getConceptLabel(payroll.concept) + ' del período ' + payroll.period }}</div>
              </div>
            </div>
          } @empty {
            <div class='bg-white dark:bg-slate-800 rounded-md shadow-sm p-8 text-center'>
              <p class='text-sm font-medium text-slate-600 dark:text-slate-300'>No hay nóminas</p>
              <p class='text-xs text-slate-400 dark:text-slate-500'>Genere una nómina por concepto para comenzar</p>
            </div>
          }
        </div>
      }
      </div>

      <app-pagination [config]="paginationConfig()" (pageChange)="onPageChange($event)" />

      <!-- Modal Generar Nómina -->
      @if (showGenerate()) {
        <app-modal [isOpen]="showGenerate()" (closeEvent)="showGenerate.set(false)" (confirmEvent)="generate()"
                   title="Generar Nómina"
                   [confirmText]="isBusy() ? 'Generando...' : 'Generar'"
                   confirmButtonClass="bg-blue-600 hover:bg-blue-700"
                   maxWidthClass="max-w-2xl">
          <div class="space-y-4">
            <div class="space-y-1">
              <label class="text-xs font-medium text-slate-600">Tipo de nómina <span class="text-red-500">*</span></label>
              <select [(ngModel)]="genForm.concept" (ngModelChange)="onConceptChange()"
                      class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                @for (c of concepts; track c.value) {
                  <option [value]="c.value">{{ c.label }}</option>
                }
              </select>
            </div>
            <p class="text-xs text-slate-500">{{ conceptHint() }}</p>

            <!-- Nómina de salario: listado completo de trabajadores activos -->
            @if (genForm.concept === 'salario') {
              <div class="space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <label class="text-xs font-medium text-slate-600">Trabajadores <span class="text-red-500">*</span></label>
                  <input type="text" [ngModel]="employeeSearch()" (ngModelChange)="employeeSearch.set($event)"
                         placeholder="Filtrar por nombre, código o CI..."
                         class="w-56 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div class="grid grid-cols-[1fr_6.5rem_8rem] gap-x-3 px-3 text-xs font-semibold text-slate-500">
                  <span>Trabajador</span><span>Días / Horas</span><span class="text-right">Salario</span>
                </div>
                <div class="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                  @for (item of manualItems; track item.employeeId) {
                    @if (salaryRowVisible(item.employeeId)) {
                      <div class="grid grid-cols-[1fr_6.5rem_8rem] gap-x-3 items-center rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2">
                        <div class="min-w-0">
                          <p class="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{{ employeeLabel(item.employeeId) }}</p>
                          <p class="text-[10px] text-slate-400">
                            @if (selectedEmployee(item.employeeId); as rowEmp) {
                              @if (usesHours(item.employeeId)) {
                                @if (rowEmp.salaryRate && rowEmp.salaryRate > 0) {
                                  Sin salario fijo · tasa {{ rowEmp.salaryRate | number:'1.2-4' }}/{{ rowEmp.salaryUnit || 'hora' }}
                                } @else {
                                  Sin salario fijo ni tarifa: indique el importe
                                }
                              } @else {
                                {{ rowEmp.salary / 190.6 | number:'1.2-4' }}/h · día = {{ rowEmp.salary / 24 | number:'1.2-2' }}
                              }
                            }
                          </p>
                        </div>
                        @if (usesHours(item.employeeId)) {
                          <input type="number" min="0" step="any" [(ngModel)]="item.hours" (ngModelChange)="updateManualSalary($index)" title="Horas trabajadas"
                                 class="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 text-right focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                        } @else {
                          <input type="number" min="0" step="any" [(ngModel)]="item.days" (ngModelChange)="updateManualSalary($index)" title="Días trabajados (admite decimales)"
                                 class="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 text-right focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                        }
                        <input type="number" min="0" [(ngModel)]="item.grossSalary" (ngModelChange)="item.grossEdited = true"
                               class="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 text-right focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                      </div>
                    }
                  } @empty {
                    <p class="text-xs text-slate-400 px-3 py-4 text-center">No hay trabajadores activos</p>
                  }
                </div>
                <p class="text-[11px] text-slate-400">Con salario fijo se descuenta solo el tiempo faltado (día = 7,9416 h, mes = 190,6 h). Sin salario fijo se cobran las unidades × la tasa del cargo — días si su tarifa es por día, horas si es por hora. Líneas sin tiempo ni importe se omiten.</p>
              </div>
            }

            <!-- Pagos adicionales: horas extra, nocturnidad, feriado y guardia — importe manual -->
            @if (isTimeSupplement()) {
              <div class="space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <label class="text-xs font-medium text-slate-600">Trabajadores <span class="text-red-500">*</span></label>
                  <input type="text" [ngModel]="employeeSearch()" (ngModelChange)="employeeSearch.set($event)"
                         placeholder="Filtrar por nombre, código o CI..."
                         class="w-56 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div class="grid gap-x-3 px-3 text-xs font-semibold text-slate-500" [class]="supplementGrid()">
                  <span>Trabajador</span>
                  @if (genForm.concept === 'nocturnidad') {
                    <span>7-11 pm (h)</span><span>11 pm-7 am (h)</span>
                  } @else {
                    <span>Horas</span>
                  }
                  <span class="text-right">Importe</span>
                </div>
                <div class="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                  @for (item of manualItems; track item.employeeId) {
                    @if (salaryRowVisible(item.employeeId)) {
                      <div class="grid gap-x-3 items-center rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2" [class]="supplementGrid()">
                        <div class="min-w-0">
                          <p class="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{{ employeeLabel(item.employeeId) }}</p>
                        </div>
                        <input type="number" min="0" step="any" [(ngModel)]="item.hours"
                               class="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 text-right focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                        @if (genForm.concept === 'nocturnidad') {
                          <input type="number" min="0" step="any" [(ngModel)]="item.nightHours"
                                 class="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 text-right focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                        }
                        <input type="number" min="0" step="any" [(ngModel)]="item.grossSalary"
                               class="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 text-right focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                      </div>
                    }
                  } @empty {
                    <p class="text-xs text-slate-400 px-3 py-4 text-center">No hay trabajadores activos</p>
                  }
                </div>
                <p class="text-[11px] text-slate-400">Indique las horas y el importe de cada trabajador; no se realizan cálculos automáticos. Líneas sin horas ni importe se omiten.</p>
              </div>
            }

            <!-- Conceptos de un solo trabajador: búsqueda con desplegable -->
            @if (isSingleWorkerConcept()) {
              <div class="space-y-3">
                <div class="relative">
                  <input type="text" [ngModel]="workerInput()" (ngModelChange)="onWorkerInput($event)"
                         (focus)="workerPickOpen.set(true)" (blur)="closeWorkerPick()"
                         placeholder="Busque por nombre, código o CI..."
                         class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                  @if (workerPickOpen()) {
                    <div class="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                      @for (e of singleWorkerOptions(); track e.id) {
                        <button type="button" (mousedown)="pickWorker(e)"
                                class="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-700"
                                [class.bg-blue-50]="e.id === manualItems[0].employeeId"
                                [class.dark:bg-slate-700]="e.id === manualItems[0].employeeId"
                                [class.font-semibold]="e.id === manualItems[0].employeeId">
                          {{ workerOptionLabel(e) }}
                        </button>
                      } @empty {
                        <p class="px-3 py-3 text-xs text-slate-400">Sin resultados</p>
                      }
                    </div>
                  }
                </div>

                @if (manualItems[0].employeeId; as empId) {
                  <!-- Acumulado de vacaciones: solo lectura -->
                  @if (['vacaciones', 'liquidacion'].includes(genForm.concept)) {
                    <div class="grid grid-cols-2 gap-3">
                      <div class="rounded-lg bg-slate-100 dark:bg-slate-700/40 px-3 py-2">
                        <p class="text-[10px] font-semibold text-slate-500 uppercase">Tiempo acumulado</p>
                        <p class="text-sm font-bold text-slate-800 dark:text-slate-100">{{ manualItems[0].accumulatedDays ?? '—' }} día(s)</p>
                      </div>
                      <div class="rounded-lg bg-slate-100 dark:bg-slate-700/40 px-3 py-2">
                        <p class="text-[10px] font-semibold text-slate-500 uppercase">Importe acumulado</p>
                        <p class="text-sm font-bold text-slate-800 dark:text-slate-100">{{ manualItems[0].accumulatedAmount != null ? (manualItems[0].accumulatedAmount | number:'1.2-2') : '—' }}</p>
                      </div>
                    </div>
                  }

                  @if (genForm.concept === 'vacaciones') {
                    <div class="grid grid-cols-3 gap-3">
                      <div class="space-y-1">
                        <label class="text-xs font-medium text-slate-600">Días a disfrutar</label>
                        <input type="number" min="0" step="any" [(ngModel)]="manualItems[0].days" (ngModelChange)="schedulePreview()"
                               class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                      </div>
                      <div class="rounded-lg bg-slate-100 dark:bg-slate-700/40 px-3 py-2">
                        <p class="text-[10px] font-semibold text-slate-500 uppercase">Tarifa diaria</p>
                        <p class="text-sm font-bold text-slate-800 dark:text-slate-100">{{ (manualItems[0].rate || 0) | number:'1.2-2' }}</p>
                      </div>
                      <div class="rounded-lg bg-slate-100 dark:bg-slate-700/40 px-3 py-2">
                        <p class="text-[10px] font-semibold text-slate-500 uppercase">Importe</p>
                        <p class="text-sm font-bold text-slate-800 dark:text-slate-100">{{ manualItems[0].grossSalary | number:'1.2-2' }}</p>
                      </div>
                    </div>
                    @if (manualItems[0].accumulatedDays != null && manualItems[0].days > 0) {
                      <p class="text-xs text-slate-500">Saldo tras el disfrute: {{ manualItems[0].accumulatedDays - manualItems[0].days | number:'1.2-2' }} día(s) · {{ (manualItems[0].accumulatedAmount || 0) - manualItems[0].grossSalary | number:'1.2-2' }} CUP</p>
                    }
                  } @else if (genForm.concept !== 'liquidacion') {
                    <div class="grid grid-cols-2 gap-3">
                      <div class="space-y-1">
                        <label class="text-xs font-medium text-slate-600">Días</label>
                        <input type="number" min="0" [(ngModel)]="manualItems[0].days" (ngModelChange)="schedulePreview()"
                               class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                      </div>
                      <div class="space-y-1">
                        <label class="text-xs font-medium text-slate-600">Importe</label>
                        <input type="number" min="0" [(ngModel)]="manualItems[0].grossSalary" (ngModelChange)="manualItems[0].grossEdited = true"
                               class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                      </div>
                    </div>
                  } @else {
                    <div class="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 space-y-1">
                      <p class="text-xs text-orange-800">Se paga todo el saldo acumulado (Art. 52): <span class="font-semibold">{{ (manualItems[0].accumulatedAmount || 0) | number:'1.2-2' }} CUP</span> por {{ (manualItems[0].accumulatedDays || 0) | number:'1.2-2' }} día(s), con cargo a la provisión 492.</p>
                      <p class="text-[11px] text-orange-700">Procese antes la nómina de salario del mes de la baja: lo que esté en borrador no entra en el acumulado.</p>
                    </div>
                  }

                  @for (w of manualItems[0].warnings || []; track w) {
                    <p class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{{ w }}</p>
                  }
                }
              </div>
            }

            @if (genForm.concept === 'libre') {
              <div class="space-y-2">
                <label class="text-xs font-medium text-slate-600">Líneas del concepto libre <span class="text-red-500">*</span></label>
                @for (line of freeItems; track $index) {
                  <div class="flex gap-2 items-center">
                    <select [(ngModel)]="line.employeeId" class="flex-1 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs">
                      <option value="">— Empleado —</option>
                      @for (e of filteredEmployees(); track e.id) {
                        <option [value]="e.id">{{ e.lastName }}, {{ e.firstName }}</option>
                      }
                    </select>
                    <input type="number" [(ngModel)]="line.amount" placeholder="Importe" class="w-24 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-right"/>
                    <input type="text" [(ngModel)]="line.description" placeholder="Concepto" class="w-28 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"/>
                    <button (click)="freeItems.splice($index, 1)" class="text-red-500 text-xs px-1">✕</button>
                  </div>
                }
                <button (click)="freeItems.push({ employeeId: '', amount: 0, description: '' })" class="text-blue-600 text-xs hover:underline">+ Añadir línea</button>
              </div>
            }
            <div class="space-y-1">
              <label class="text-xs font-medium text-slate-600">Período <span class="text-red-500">*</span></label>
              <input type="month" [(ngModel)]="genForm.period" (ngModelChange)="schedulePreview()"
                     class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <label class="text-xs font-medium text-slate-600">Fecha inicio <span class="text-red-500">*</span></label>
                <input type="date" [(ngModel)]="genForm.startDate" (ngModelChange)="schedulePreview()"
                       class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div class="space-y-1">
                <label class="text-xs font-medium text-slate-600">Fecha fin <span class="text-red-500">*</span></label>
                <input type="date" [(ngModel)]="genForm.endDate" (ngModelChange)="schedulePreview()"
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
                   [showConfirm]="isDetailEditable()"
                   confirmButtonClass="bg-blue-600 hover:bg-blue-700" maxWidthClass="max-w-3xl">
          <div class="space-y-4">

            <!-- Resumen de la nómina -->
            <div class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4">
              <div class="flex flex-wrap items-center gap-2">
                <span [class]="getConceptClass(detailPayroll()?.concept)" class="px-2 py-1 rounded-full text-xs font-medium">
                  {{ getConceptLabel(detailPayroll()?.concept) }}
                </span>
                <span [class]="getStatusClass(detailPayroll()?.status)" class="px-2 py-1 rounded-full text-xs font-medium">
                  {{ getStatusLabel(detailPayroll()?.status) }}
                </span>
                <span class="text-sm text-slate-600 dark:text-slate-300">
                  {{ detailPayroll()?.period }} · {{ detailItems().length }} empleado(s)
                </span>
              </div>
              <div class="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Devengado</p>
                  <p class="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{{ detailTotals().gross | number:'1.2-2' }}</p>
                </div>
                <div>
                  <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Retenciones</p>
                  <p class="text-lg font-bold text-red-600 dark:text-red-400 mt-0.5">{{ detailTotals().deductions | number:'1.2-2' }}</p>
                </div>
                <div>
                  <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Neto a pagar</p>
                  <p class="text-lg font-bold text-green-600 dark:text-green-400 mt-0.5">{{ detailTotals().net | number:'1.2-2' }}</p>
                </div>
              </div>
            </div>

            @if (!isDetailEditable()) {
              <div class="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2">
                <svg class="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <p class="text-xs text-amber-800 dark:text-amber-300">Solo lectura: las líneas se editan únicamente en borrador. Para rectificar una nómina procesada o pagada, cancélela y genérela de nuevo.</p>
              </div>
            }

            <!-- Fichas por empleado -->
            <div class="space-y-3">
              @for (item of detailItems(); track item.id) {
                <div class="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">

                  <div class="flex items-center justify-between gap-3 bg-white dark:bg-slate-800 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                    <div class="min-w-0">
                      <p class="font-semibold text-slate-900 dark:text-white truncate">{{ item.employeeName }}</p>
                      @if (isConceptPayroll() && (item.paidUnits || item.appliedRate)) {
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          @if (item.paidUnits) { {{ item.paidUnits }} unidad(es) }
                          @if (item.paidUnits && item.appliedRate) { · }
                          @if (item.appliedRate) { tasa {{ item.appliedRate * 100 | number:'1.0-2' }}% }
                        </p>
                      }
                    </div>
                    <div class="flex items-center gap-3 flex-shrink-0">
                      <div class="text-right">
                        <p class="text-xs text-slate-500 dark:text-slate-400">Neto</p>
                        <p class="font-bold text-green-600 dark:text-green-400">{{ item.netSalary | number:'1.2-2' }}</p>
                      </div>
                      <button (click)="openReceipt(item)" title="Ver recibo de pago"
                              class="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                      </button>
                    </div>
                  </div>

                  <div class="px-4 py-3 space-y-3">
                    <div>
                      <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Devengos</p>
                      <div class="grid grid-cols-3 gap-3">
                        <label class="block">
                          <span class="text-xs text-slate-600 dark:text-slate-400">Salario base</span>
                          <input type="number" step="0.01" [(ngModel)]="item.baseSalary" (ngModelChange)="recalcItem(item)" [disabled]="!isDetailEditable()" [class]="detailInputClass"/>
                        </label>
                        <label class="block">
                          <span class="text-xs text-slate-600 dark:text-slate-400">{{ detailUnitLabel() }}</span>
                          <input type="number" step="0.01" [(ngModel)]="item.paidUnits" (ngModelChange)="recalcItem(item)" [disabled]="!isDetailEditable()" [class]="detailInputClass"/>
                        </label>
                        <label class="block">
                          <span class="text-xs text-slate-600 dark:text-slate-400">Horas extra</span>
                          <input type="number" step="0.01" [(ngModel)]="item.overtimePay" (ngModelChange)="recalcItem(item)" [disabled]="!isDetailEditable()" [class]="detailInputClass"/>
                        </label>
                        <label class="block">
                          <span class="text-xs text-slate-600 dark:text-slate-400">Bonos</span>
                          <input type="number" step="0.01" [(ngModel)]="item.bonuses" (ngModelChange)="recalcItem(item)" [disabled]="!isDetailEditable()" [class]="detailInputClass"/>
                        </label>
                      </div>
                    </div>

                    <div>
                      <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Deducciones</p>
                      <div class="grid grid-cols-3 gap-3">
                        <label class="block">
                          <span class="text-xs text-slate-600 dark:text-slate-400">Seguridad social</span>
                          <input type="number" step="0.01" [(ngModel)]="item.socialSecurity" (ngModelChange)="recalcItem(item)" [disabled]="!isDetailEditable()" [class]="detailInputClass"/>
                        </label>
                        <label class="block">
                          <span class="text-xs text-slate-600 dark:text-slate-400">Impuesto s/ ingresos</span>
                          <input type="number" step="0.01" [(ngModel)]="item.taxWithholding" (ngModelChange)="recalcItem(item)" [disabled]="!isDetailEditable()" [class]="detailInputClass"/>
                        </label>
                        <label class="block">
                          <span class="text-xs text-slate-600 dark:text-slate-400">Pensión</span>
                          <input type="number" step="0.01" [(ngModel)]="item.pension" (ngModelChange)="recalcItem(item)" [disabled]="!isDetailEditable()" [class]="detailInputClass"/>
                        </label>
                        <label class="block">
                          <span class="text-xs text-slate-600 dark:text-slate-400">Otras retenciones</span>
                          <input type="number" step="0.01" [(ngModel)]="item.otherDeductions" (ngModelChange)="recalcItem(item)" [disabled]="!isDetailEditable()" [class]="detailInputClass"/>
                        </label>
                      </div>
                    </div>

                    <div class="flex flex-wrap justify-between gap-x-6 gap-y-1 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs">
                      <span class="text-slate-500 dark:text-slate-400">Devengado <span class="font-semibold text-slate-700 dark:text-slate-200">{{ item.grossSalary | number:'1.2-2' }}</span></span>
                      <span class="text-slate-500 dark:text-slate-400">Retenciones <span class="font-semibold text-slate-700 dark:text-slate-200">{{ item.totalDeductions | number:'1.2-2' }}</span></span>
                      @if (item.vacationProvision > 0) {
                        <span class="text-slate-500 dark:text-slate-400">Provisión vacaciones <span class="font-semibold text-slate-700 dark:text-slate-200">{{ item.vacationProvision | number:'1.2-2' }}</span></span>
                      }
                    </div>
                  </div>
                </div>
              } @empty {
                <div class="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 py-12 text-center">
                  <p class="text-sm font-medium text-slate-600 dark:text-slate-300">Esta nómina no tiene líneas</p>
                  <p class="text-xs text-slate-400 dark:text-slate-500">Verifique que existan empleados activos con contrato vigente</p>
                </div>
              }
            </div>
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
            <p><strong>Bonos/comisiones:</strong> {{ (receiptItem()?.bonuses || 0) + (receiptItem()?.commissions || 0) + (receiptItem()?.allowances || 0) | number:'1.2-2' }}</p>
            <p><strong>Seguridad Social (5%):</strong> {{ receiptItem()?.socialSecurity | number:'1.2-2' }}</p>
            <p><strong>Impuesto sobre ingresos:</strong> {{ receiptItem()?.taxWithholding | number:'1.2-2' }}</p>
            <p><strong>Pensión:</strong> {{ receiptItem()?.pension | number:'1.2-2' }}</p>
            <p><strong>Otras retenciones:</strong> {{ receiptItem()?.otherDeductions | number:'1.2-2' }}</p>
            @if (receiptItem()?.vacationProvision > 0) {
              <p><strong>Provisión vacaciones:</strong> {{ receiptItem()?.vacationProvision | number:'1.2-2' }}</p>
            }
            <p class="text-lg font-bold text-right border-t pt-2">NETO: {{ receiptItem()?.netSalary | number:'1.2-2' }}</p>
            <p class="text-xs text-slate-400 text-center">Generado por MIDAS</p>
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

      <!-- Modal Seleccionar Unidad y Agrupación PDF -->
      @if (showPdfUnitModal()) {
        <app-modal [isOpen]="showPdfUnitModal()" (closeEvent)="showPdfUnitModal.set(false)" (confirmEvent)="confirmPdfUnit()"
                   title="Imprimir Modelo SC-4-06"
                   confirmText="Generar PDF"
                   confirmButtonClass="bg-violet-600 hover:bg-violet-700"
                   maxWidthClass="max-w-md">
          <div class="space-y-5">
            <div class="space-y-2">
              <p class="text-sm text-slate-600 dark:text-slate-300">Unidad de tiempo:</p>
              <div class="flex gap-4">
                <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input type="radio" name="pdfUnit" value="dias" [(ngModel)]="pdfUnit" class="accent-violet-600 w-4 h-4">
                  Días
                </label>
                <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input type="radio" name="pdfUnit" value="horas" [(ngModel)]="pdfUnit" class="accent-violet-600 w-4 h-4">
                  Horas
                </label>
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-sm text-slate-600 dark:text-slate-300">Agrupar por:</p>
              <div class="space-y-2">
                <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input type="radio" name="pdfGroupBy" value="area" [(ngModel)]="pdfGroupBy" class="accent-violet-600 w-4 h-4">
                  Área
                </label>
                <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input type="radio" name="pdfGroupBy" value="costCenterAccount" [(ngModel)]="pdfGroupBy" class="accent-violet-600 w-4 h-4">
                  Centro de costo / Cuenta
                </label>
                <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input type="radio" name="pdfGroupBy" value="none" [(ngModel)]="pdfGroupBy" class="accent-violet-600 w-4 h-4">
                  Sin agrupar
                </label>
              </div>
            </div>
          </div>
        </app-modal>
      }
    </div>
  `
})
export class PayrollComponent implements OnInit {
  private payrollService = inject(PayrollService);
  private hrService = inject(HrService);
  private financeService = inject(FinanceService);
  private confirmDialog = inject(ConfirmDialogService);

  items = signal<any[]>([]);
  stats = signal<any>(null);
  currentPage = signal(1);
  pageSize = 10;
  isLoading = signal(false);
  isBusy = signal(false);
  showGenerate = signal(false);
  showDetail = signal(false);
  showReceipt = signal(false);
  showPay = signal(false);
  banks = signal<any[]>([]);
  toast = signal<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  detailPayroll = signal<any>(null);
  detailItems = signal<any[]>([]);
  receiptItem = signal<any>(null);
  showPdfUnitModal = signal(false);
  pdfPayroll: any = null;
  pdfUnit: 'dias' | 'horas' = 'dias';
  pdfGroupBy: 'area' | 'costCenterAccount' | 'none' = 'area';

  statusFilter = '';
  conceptFilter = '';
  periodFilter = '';
  fromDate = '';
  toDate = '';

  concepts = [
    { value: 'salario', label: 'Salario' },
    { value: 'vacaciones', label: 'Vacaciones' },
    { value: 'subsidio', label: 'Subsidio' },
    { value: 'maternidad', label: 'Licencia de maternidad' },
    { value: 'liquidacion', label: 'Liquidación por terminación' },
    { value: 'horas_extras', label: 'Horas extras' },
    { value: 'nocturnidad', label: 'Nocturnidad' },
    { value: 'guardia', label: 'Guardia' },
    { value: 'feriado', label: 'Días feriados' },
    { value: 'libre', label: 'Concepto libre' },
  ];

  private static readonly TIME_SUPPLEMENTS = ['horas_extras', 'nocturnidad', 'feriado', 'guardia'];
  private static readonly SINGLE_WORKER = ['vacaciones', 'subsidio', 'maternidad', 'liquidacion'];
  private static readonly HOURS_PER_WORKDAY = 190.6 / 24;
  employees = signal<Employee[]>([]);
  freeItems: { employeeId: string; amount: number; description: string }[] = [];

  /** Líneas de la nómina manual: trabajador, unidades e importe calculado. */
  manualItems: {
    employeeId: string;
    /** Días trabajados (trabajadores con salario fijo). */
    days: number;
    /** Horas trabajadas (trabajadores sin salario fijo o tiempo suelto). */
    hours?: number;
    /** Nocturnidad: horas de la banda 11 pm-7 am (`hours` es la de 7-11 pm). */
    nightHours?: number;
    grossSalary: number;
    /** Tarifa por unidad que devuelve la previsualización del backend. */
    rate?: number;
    accumulatedDays?: number | null;
    accumulatedAmount?: number | null;
    warnings?: string[];
    /** El usuario corrigió el importe a mano: el preview no lo pisa. */
    grossEdited?: boolean;
  }[] = [];
  employeeSearch = signal('');
  /** Texto del buscador del concepto individual y estado de su desplegable. */
  workerInput = signal('');
  workerPickOpen = signal(false);

  /** Catálogo del backend: conceptos y tarifas de nocturnidad de la empresa. */
  catalog = signal<any>(null);
  private previewTimer: ReturnType<typeof setTimeout> | null = null;

  /** Últimos 12 meses naturales, para no depender de períodos escritos a mano. */
  periodOptions = PayrollComponent.buildPeriodOptions();

  private static buildPeriodOptions(): { value: string; label: string }[] {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = String(d.getMonth() + 1).padStart(2, '0');
      options.push({ value: `${d.getFullYear()}-${month}`, label: `${months[d.getMonth()]} ${d.getFullYear()}` });
    }
    return options;
  }

  hasActiveFilters(): boolean {
    return !!(this.conceptFilter || this.statusFilter || this.periodFilter || this.fromDate || this.toDate);
  }

  resetFilters() {
    this.conceptFilter = '';
    this.statusFilter = '';
    this.periodFilter = '';
    this.fromDate = '';
    this.toDate = '';
    this.loadData();
  }

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

  genForm: {
    concept: string;
    period: string;
    startDate: string;
    endDate: string;
  } = {
    concept: 'salario',
    period: '',
    startDate: '',
    endDate: '',
  };
  payingId: number | null = null;
  selectedBankAccountId: string | null = null;

  ngOnInit() {
    this.loadData();
    this.loadStats();
    this.financeService.getBanks({ status: 'active' }).subscribe({
      next: (data) => this.banks.set(data || []),
      error: () => { /* cuentas bancarias opcionales */ }
    });
  }

  loadData() {
    this.isLoading.set(true);
    this.payrollService.getAll({
      status: this.statusFilter || undefined,
      concept: this.conceptFilter || undefined,
      period: this.periodFilter || undefined,
      startDate: this.fromDate || undefined,
      endDate: this.toDate || undefined,
    }).subscribe({
      next: (data) => { this.items.set(data?.payrolls || []); this.currentPage.set(1); this.isLoading.set(false); },
      error: () => { this.isLoading.set(false); this.showToast('Error al cargar nóminas', 'error'); },
    });
  }

  loadStats() {
    this.payrollService.getStatistics().subscribe({
      next: (data) => this.stats.set(data),
      error: () => { /* el resumen es informativo, no bloquea el listado */ },
    });
  }

  openGenerate() {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    this.genForm = {
      concept: 'salario',
      period,
      startDate: `${period}-01`,
      endDate: `${period}-${String(lastDay).padStart(2, '0')}`,
    };
    this.freeItems = [];
    this.manualItems = [];
    this.employeeSearch.set('');
    this.showGenerate.set(true);
    // Todas las fichas, no solo las activas: la liquidación se genera para el
    // trabajador que causó baja.
    this.hrService.getEmployees().subscribe({
      next: (data) => {
        this.employees.set(data || []);
        this.rebuildLines();
      },
      error: () => this.showToast('No se pudieron cargar los empleados', 'error'),
    });
    this.loadCatalog();
  }

  /** Catálogo y tarifas de nocturnidad: se relee al abrir, pueden haber cambiado. */
  private loadCatalog() {
    this.payrollService.getConceptCatalog().subscribe({
      next: (c) => {
        this.catalog.set(c);
        if (Array.isArray(c?.concepts) && c.concepts.length) {
          this.concepts = c.concepts.map((x: any) => ({ value: x.value, label: x.label }));
        }
      },
      error: () => { /* se usa la lista estática de conceptos */ },
    });
  }

  onConceptChange() {
    this.rebuildLines();
  }

  /** Reconstruye las líneas según el concepto elegido. */
  private rebuildLines() {
    this.employeeSearch.set('');
    this.workerInput.set('');
    this.workerPickOpen.set(false);
    if (this.isTimeSupplement()) {
      // Pagos adicionales: todos los trabajadores activos, sin horas; solo
      // se generan las líneas a las que se les indique tiempo.
      this.manualItems = this.employees()
        .filter((e) => e.status === 'active')
        .map((e) => ({ employeeId: e.id, days: 0, hours: 0, nightHours: 0, grossSalary: 0 }));
      return;
    }
    if (this.genForm.concept === 'salario') {
      // La nómina de salario precarga todo el listado de trabajadores activos.
      // Con salario fijo se parte del mes completo (24 días) y se restan las
      // ausencias; sin salario fijo se empieza en cero horas.
      this.manualItems = this.employees()
        .filter((e) => e.status === 'active')
        .map((e) => ({
          employeeId: e.id,
          days: Number(e.salary || 0) > 0 ? 24 : 0,
          hours: 0,
          grossSalary: 0,
        }));
      for (let i = 0; i < this.manualItems.length; i++) {
        this.updateManualSalary(i);
      }
      this.refreshPreview();
    } else if (this.genForm.concept === 'libre') {
      this.manualItems = [];
      if (!this.freeItems.length) {
        this.freeItems = [{ employeeId: '', amount: 0, description: '' }];
      }
    } else {
      // El resto de los conceptos se genera trabajador por trabajador.
      this.manualItems = [{ employeeId: '', days: 0, grossSalary: 0 }];
    }
  }

  isSingleWorkerConcept(): boolean {
    return this.isSingleConcept(this.genForm.concept);
  }

  isSingleConcept(concept: string): boolean {
    return PayrollComponent.SINGLE_WORKER.includes(concept);
  }

  isTimeSupplement(): boolean {
    return PayrollComponent.TIME_SUPPLEMENTS.includes(this.genForm.concept);
  }

  supplementGrid(): string {
    return this.genForm.concept === 'nocturnidad'
      ? 'grid-cols-[1fr_5rem_5rem_7rem]'
      : 'grid-cols-[1fr_5.5rem_8rem]';
  }

  /**
   * Trabajadores elegibles del concepto individual: la liquidación se hace a
   * quien causó baja (se listan todos); el resto, solo activos. El elegido se
   * conserva en la lista aunque el filtro de texto lo excluya, para que el
   * selector no muestre un valor vacío con un trabajador seleccionado.
   */
  singleWorkerOptions(): Employee[] {
    const selectedId = this.manualItems[0]?.employeeId;
    const selected = selectedId ? this.selectedEmployee(selectedId) : undefined;
    const raw = this.workerInput().trim().toLowerCase();
    // Con trabajador elegido el campo muestra su etiqueta: no es un filtro.
    const term =
      selected && raw === this.workerOptionLabel(selected).toLowerCase() ? '' : raw;
    const eligible = this.employees().filter(
      (e) => this.genForm.concept === 'liquidacion' || e.status === 'active' || e.id === selectedId,
    );
    const matches = (e: Employee) =>
      !term ||
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(term) ||
      `${e.lastName} ${e.firstName}`.toLowerCase().includes(term) ||
      (e.employeeCode || '').toLowerCase().includes(term) ||
      (e.documentId || '').toLowerCase().includes(term);
    return eligible.filter((e) => matches(e) || e.id === selectedId);
  }

  /** Etiqueta que muestra el buscador para un trabajador elegible. */
  workerOptionLabel(e: Employee): string {
    const doc = e.documentId ? ` · CI ${e.documentId}` : '';
    const status = e.status !== 'active' ? ' (baja)' : '';
    return `${e.lastName}, ${e.firstName} · ${e.employeeCode}${doc}${status}`;
  }

  /** Escribir en el buscador abre el desplegable y anula la elección previa. */
  onWorkerInput(value: string) {
    this.workerInput.set(value);
    this.workerPickOpen.set(true);
    const line = this.manualItems[0];
    const selected = line ? this.selectedEmployee(line.employeeId) : undefined;
    if (selected && value !== this.workerOptionLabel(selected)) {
      line.employeeId = '';
      this.onSingleWorkerChange();
    }
  }

  /** Rellena el campo con el trabajador elegido y recalcula sus datos. */
  pickWorker(e: Employee) {
    if (this.manualItems[0]) {
      this.manualItems[0].employeeId = e.id;
    }
    this.workerInput.set(this.workerOptionLabel(e));
    this.workerPickOpen.set(false);
    this.onSingleWorkerChange();
  }

  /** Al salir del campo se restaura la etiqueta del trabajador elegido. */
  closeWorkerPick() {
    this.workerPickOpen.set(false);
    const line = this.manualItems[0];
    const selected = line ? this.selectedEmployee(line.employeeId) : undefined;
    if (selected) {
      this.workerInput.set(this.workerOptionLabel(selected));
    }
  }

  onSingleWorkerChange() {
    const line = this.manualItems[0];
    if (line) {
      line.accumulatedDays = null;
      line.accumulatedAmount = null;
      line.warnings = [];
      line.grossEdited = false;
      line.grossSalary = 0;
      line.rate = 0;
    }
    this.schedulePreview();
  }

  selectedEmployee(id: string): Employee | undefined {
    return this.employees().find((e) => e.id === id);
  }

  employeeLabel(id: string): string {
    const e = this.selectedEmployee(id);
    if (!e) return '—';
    const doc = e.documentId ? ` · CI ${e.documentId}` : '';
    return `${e.lastName}, ${e.firstName} · ${e.employeeCode}${doc}`;
  }

  /** Visibilidad de la fila del listado de salario según el filtro. */
  salaryRowVisible(employeeId: string): boolean {
    const term = this.employeeSearch().trim().toLowerCase();
    if (!term) return true;
    const e = this.selectedEmployee(employeeId);
    if (!e) return false;
    return (
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(term) ||
      (e.employeeCode || '').toLowerCase().includes(term) ||
      (e.documentId || '').toLowerCase().includes(term)
    );
  }

  filteredEmployees = computed(() => {
    const term = this.employeeSearch().trim().toLowerCase();
    const list = this.employees();
    if (!term) return list;
    return list.filter((e) =>
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(term) ||
      (e.employeeCode || '').toLowerCase().includes(term) ||
      (e.documentId || '').toLowerCase().includes(term),
    );
  });

  /**
   * El campo de tiempo pide horas solo cuando el cargo tarifa por hora.
   * Con salario fijo, con tarifa por día y sin tarifa se entran días — el
   * backend los convierte a la unidad del cargo (día = 7,9416 h).
   */
  usesHours(employeeId: string): boolean {
    const e = this.selectedEmployee(employeeId);
    if (!e) return false;
    if (Number(e.salary || 0) > 0) return false;
    return e.salaryUnit === 'hora';
  }

  /**
   * Devengo del mes = salario − (horas faltadas × tarifa horaria). La tarifa
   * horaria es salario/190,6 y un día laborable cubre 7,9416 h (190,6/24), así
   * que equivale a días/24 × salario topado en el mes completo: trabajar más
   * del fondo de tiempo no paga más. Sin salario fijo: unidades × tarifa del
   * cargo (horas o días según su unidad de tiempo).
   */
  updateManualSalary(index: number) {
    const line = this.manualItems[index];
    if (!line) return;
    const emp = this.selectedEmployee(line.employeeId);
    const salary = Number(emp?.salary || 0);
    const days = Number(line.days || 0);
    const hours = Number(line.hours || 0);
    const round2 = (v: number) => Math.round(v * 100) / 100;

    if (salary > 0) {
      const workedHours = days * (190.6 / 24) + hours;
      line.grossSalary =
        workedHours > 0
          ? round2(salary * Math.min(1, workedHours / 190.6))
          : 0;
      line.grossEdited = false;
    } else {
      const rate = Number(emp?.salaryRate || 0);
      const workedHours = hours > 0 ? hours : days * (190.6 / 24);
      const units = emp?.salaryUnit === 'día'
        ? days || workedHours / (190.6 / 24)
        : workedHours;
      if (rate > 0 && units > 0) {
        line.grossSalary = round2(units * rate);
        line.grossEdited = false;
      } else if (units <= 0 && !line.grossEdited) {
        line.grossSalary = 0;
      }
    }
  }

  /** El preview sale del backend; se debouncea para no pedir por tecla. */
  schedulePreview() {
    if (this.previewTimer) clearTimeout(this.previewTimer);
    this.previewTimer = setTimeout(() => this.refreshPreview(), 300);
  }

  /**
   * Pide al backend la tarifa aplicable, el importe sugerido por la ley, el
   * acumulado de vacaciones y las advertencias de las líneas actuales.
   */
  refreshPreview() {
    if (!this.genForm.period || !this.genForm.startDate || !this.genForm.endDate) {
      return;
    }
    const items = this.manualItems.filter((i) => i.employeeId);
    if (!items.length) return;
    this.payrollService
      .previewManual({
        concept: this.genForm.concept,
        period: this.genForm.period,
        startDate: this.genForm.startDate,
        endDate: this.genForm.endDate,
        items: items.map((i) => ({
          employeeId: i.employeeId,
          days: Number(i.days || 0),
          hours: Number(i.hours || 0),
          nightHours: Number(i.nightHours || 0),
          grossSalary: Number(i.grossSalary || 0),
        })),
      })
      .subscribe({
        next: (contexts: any[]) => {
          for (const ctx of contexts || []) {
            const line = this.manualItems.find(
              (l) => l.employeeId === ctx.employeeId,
            );
            if (!line) continue;
            line.rate = Number(ctx.rate || 0);
            line.accumulatedDays = ctx.accumulatedDays;
            line.accumulatedAmount = ctx.accumulatedAmount;
            line.warnings = ctx.warnings || [];
            // El importe sugerido se aplica salvo que el usuario lo haya
            // corregido a mano. En salario se recalcula con la fórmula local
            // (la tasa del preview es horaria: días × tasa no aplica).
            if (this.genForm.concept !== 'salario' && !line.grossEdited) {
              line.grossSalary = Number(ctx.suggestedGross || 0);
            } else if (this.genForm.concept === 'salario' && !line.grossEdited) {
              const idx = this.manualItems.findIndex((l) => l === line);
              if (idx >= 0) this.updateManualSalary(idx);
            }
          }
          this.manualItems = [...this.manualItems];
        },
        error: () => { /* el preview es informativo; la generación valida */ },
      });
  }

  conceptHint(): string {
    const hints: Record<string, string> = {
      salario: 'Mes completo = 190,6 h (24 días de 7,9416 h): con salario fijo se descuenta solo el tiempo faltado a la tarifa horaria (salario ÷ 190,6); sin salario fijo se cobran las unidades × la tasa del cargo (días u horas según la unidad del cargo).',
      vacaciones: 'Seleccione el trabajador y los días a disfrutar: se paga con el acumulado del submayor de vacaciones (provisión 492), no a gasto.',
      subsidio: 'Subsidio por enfermedad o accidente (Arts. 39-46): se calcula con el salario promedio, la carencia y el origen de la incapacidad. Se carga a la provisión 500.',
      maternidad: 'Licencia de maternidad (DL 56/2021): indique los días y el importe de la prestación correspondiente.',
      liquidacion: 'Paga todo el saldo de vacaciones acumulado del trabajador que causa baja (Art. 52). Se carga a la provisión 492.',
      horas_extras: 'Trabajo extraordinario (Art. 122 Ley 116): indique las horas y el importe a pagar a cada trabajador. Carga a gasto y no acumula vacaciones.',
      nocturnidad: 'Pago adicional por turno nocturno: indique las horas de cada banda y el importe a pagar. No acumula vacaciones.',
      guardia: 'Pago por guardia: indique las horas y el importe bruto de cada trabajador. Carga a gasto, grava impuestos empresariales y no acumula vacaciones.',
      feriado: 'Feriado o día festivo/conmemorativo trabajado: indique las horas y el importe adicional a pagar. Acumula solo importe de vacaciones (Art. 102).',
      libre: 'Nómina de concepto libre: defina manualmente empleado, importe y descripción de cada línea.',
    };
    return hints[this.genForm.concept] || '';
  }

  isConceptPayroll(): boolean {
    const c = this.detailPayroll()?.concept;
    return !!c && c !== 'salario';
  }

  /** Etiqueta de las unidades pagadas según el concepto de la nómina abierta. */
  detailUnitLabel(): string {
    const c = this.detailPayroll()?.concept;
    if (c === 'maternidad') return 'Unidades';
    if (PayrollComponent.TIME_SUPPLEMENTS.includes(c)) return 'Horas';
    if (c === 'vacaciones' || c === 'liquidacion') return 'Días';
    return 'Días trabajados';
  }

  /** Las líneas solo se pueden modificar mientras la nómina está en borrador. */
  isDetailEditable(): boolean {
    return this.detailPayroll()?.status === 'draft';
  }

  detailInputClass = 'mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed';

  detailTotals = computed(() => {
    return this.detailItems().reduce(
      (acc, i) => ({
        gross: acc.gross + Number(i.grossSalary || 0),
        deductions: acc.deductions + Number(i.totalDeductions || 0),
        net: acc.net + Number(i.netSalary || 0),
      }),
      { gross: 0, deductions: 0, net: 0 }
    );
  });

  generate() {
    if (!this.genForm.period || !this.genForm.startDate || !this.genForm.endDate) {
      this.showToast('Período y fechas son obligatorios', 'error');
      return;
    }

    let request;
    if (this.genForm.concept === 'libre') {
      const items = this.freeItems.filter((i) => i.employeeId && i.amount > 0);
      if (items.length === 0) {
        this.showToast('Añada al menos una línea con empleado e importe', 'error');
        return;
      }
      request = this.payrollService.generateFree({ ...this.genForm, items });
    } else {
      // La liquidación no lleva unidades: paga todo el saldo del trabajador.
      // En los pagos adicionales cuentan las líneas con horas o importe.
      const supplement = this.isTimeSupplement();
      const lines = this.manualItems.filter(
        (i) =>
          i.employeeId &&
          (supplement
            ? Number(i.hours) > 0 ||
              Number(i.nightHours) > 0 ||
              Number(i.grossSalary) > 0
            : Number(i.days) > 0 ||
              Number(i.hours) > 0 ||
              Number(i.grossSalary) > 0 ||
              this.genForm.concept === 'liquidacion'),
      );
      if (lines.length === 0) {
        this.showToast(
          this.genForm.concept === 'liquidacion'
            ? 'Seleccione el trabajador a liquidar'
            : supplement
              ? 'Indique horas o importe de al menos un trabajador'
              : 'Indique trabajador y unidades o importe',
          'error',
        );
        return;
      }
      request = this.payrollService.generateManual({
        concept: this.genForm.concept,
        period: this.genForm.period,
        startDate: this.genForm.startDate,
        endDate: this.genForm.endDate,
        items: lines.map((l) => ({
          employeeId: l.employeeId,
          days: Number(l.days || 0),
          hours: Number(l.hours || 0),
          nightHours: Number(l.nightHours || 0),
          grossSalary: Number(l.grossSalary || 0),
        })),
      });
    }
    this.isBusy.set(true);
    request.subscribe({
      next: () => {
        this.isBusy.set(false);
        this.showGenerate.set(false);
        this.showToast('Nómina generada en borrador', 'success');
        this.loadData();
        this.loadStats();
      },
      error: (err) => {
        this.isBusy.set(false);
        this.showToast(err?.error?.message || 'Error al generar la nómina', 'error');
      }
    });
  }

  processPayroll(payroll: any) {
    this.isBusy.set(true);
    this.payrollService.process(payroll.id, 'system').subscribe({
      next: (res: any) => {
        this.isBusy.set(false);
        const warnings: string[] = res?.warnings || [];
        this.showToast(
          warnings.length
            ? `Nómina procesada y contabilizada. Avisos: ${warnings.join(' ')}`
            : 'Nómina procesada y contabilizada',
          warnings.length ? 'warning' : 'success',
        );
        this.loadData();
        this.loadStats();
      },
      error: (err) => {
        this.isBusy.set(false);
        this.showToast(err?.error?.message || 'Error al procesar la nómina', 'error');
      }
    });
  }

  openDetail(payroll: any) {
    this.detailPayroll.set(payroll);
    // Normalizamos a número para que los totales y el resumen no dependan del tipo que devuelva la API.
    this.detailItems.set(
      (payroll.items || []).map((i: any) => {
        const item = { ...i };
        this.normalizeItem(item);
        return item;
      })
    );
    this.showDetail.set(true);
  }

  private normalizeItem(item: any) {
    item.baseSalary = Number(item.baseSalary) || 0;
    item.paidUnits = Number(item.paidUnits) || 0;
    item.overtimePay = Number(item.overtimePay) || 0;
    item.bonuses = Number(item.bonuses) || 0;
    item.commissions = Number(item.commissions) || 0;
    item.allowances = Number(item.allowances) || 0;
    item.socialSecurity = Number(item.socialSecurity) || 0;
    item.pension = Number(item.pension) || 0;
    item.taxWithholding = Number(item.taxWithholding) || 0;
    item.unionDues = Number(item.unionDues) || 0;
    item.otherDeductions = Number(item.otherDeductions) || 0;

    const isSalary = this.detailPayroll()?.concept === 'salario';
    if (isSalary) {
      const extras = item.overtimePay + item.bonuses + item.commissions + item.allowances;
      // Tasa diaria que produjo el devengado: se conserva al recalcular para
      // no pisar la tarifa del cargo con salary/24. Solo cuando la tasa
      // coincide con salary/24 (trabajador sin cargo tarifado) el salario
      // base la gobierna.
      if (item._dailyRate == null) {
        const base = Number(item.grossSalary || 0) - extras;
        item._dailyRate =
          item.paidUnits > 0 && base > 0
            ? base / item.paidUnits
            : Number(item.baseSalary || 0) / 24;
        item._rateFromBase =
          Math.abs(item._dailyRate - Number(item.baseSalary || 0) / 24) < 0.005;
      }
      if (item._rateFromBase) {
        item._dailyRate = Number(item.baseSalary || 0) / 24;
      }
      if (item._dailyRate > 0) {
        const paidUnits = item.paidUnits > 0 ? item.paidUnits : 24;
        // Con salario fijo el devengo se topa en el mes completo (24 días de
        // 7,9416 h = 190,6 h); sin salario fijo las unidades son horas y
        // escalan con la tasa implícita de la línea.
        const cappedUnits =
          Number(item.baseSalary || 0) > 0 ? Math.min(paidUnits, 24) : paidUnits;
        const baseEarnings = Number((item._dailyRate * cappedUnits).toFixed(2));
        item.grossSalary = Number((baseEarnings + extras).toFixed(2));
        item.paidUnits = paidUnits;
      } else {
        item.grossSalary = Number(item.grossSalary || 0);
      }
      // Art. 102 Ley 116: 9,09 % de los salarios percibidos del período, no del
      // salario contractual, igual que en el backend.
      item.vacationProvision = Number((item.grossSalary * 0.0909).toFixed(2));
    } else if (PayrollComponent.TIME_SUPPLEMENTS.includes(this.detailPayroll()?.concept)) {
      // Pago por horas: al corregir las horas el importe escala con la
      // tarifa efectiva de la línea; el servidor lo vuelve a validar.
      if (item._unitRate == null) {
        item._unitRate = item.paidUnits > 0 ? Number(item.grossSalary || 0) / item.paidUnits : 0;
      }
      item.grossSalary = item._unitRate > 0
        ? Number((item._unitRate * item.paidUnits).toFixed(2))
        : Number(item.grossSalary) || 0;
      item.vacationProvision = Number((item.grossSalary * 0.0909).toFixed(2));
    } else {
      item.grossSalary = Number(item.grossSalary) || 0;
      item.vacationProvision = Number(item.vacationProvision) || 0;
    }

    item.totalDeductions = item.socialSecurity + item.pension + item.taxWithholding + item.unionDues + item.otherDeductions;
    item.netSalary = item.grossSalary - item.totalDeductions;
  }

  recalcItem(item: any) {
    this.normalizeItem(item);
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
        this.loadStats();
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
      next: () => { this.showToast('Nómina cancelada y comprobantes anulados', 'success'); this.loadData(); this.loadStats(); },
      error: (err) => this.showToast(err?.error?.message || 'Error al cancelar la nómina', 'error')
    });
  }

  openPdfModal(payroll: any) {
    this.pdfPayroll = payroll;
    this.pdfUnit = 'dias';
    this.pdfGroupBy = 'area';
    this.showPdfUnitModal.set(true);
  }

  confirmPdfUnit() {
    this.showPdfUnitModal.set(false);
    if (!this.pdfPayroll) return;
    this.payrollService.exportPdf(this.pdfPayroll.id, this.pdfUnit, this.pdfGroupBy).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nomina-sc-4-06-${this.pdfPayroll.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.showToast('Error al generar el PDF de la nómina', 'error'),
    });
  }

  payrollSummary(payroll: any) {
    const totalGross = Number(payroll.totalGross || 0);
    const items = payroll.items || [];
    const isVacation = payroll.concept === 'vacaciones';
    const salary = isVacation ? 0 : totalGross;
    const vacation = isVacation ? totalGross : 0;
    const incomeTax = items.reduce((s: number, i: any) => s + Number(i.taxWithholding || 0), 0);
    const specialSS = items.reduce((s: number, i: any) => s + Number(i.socialSecurity || 0), 0);
    const toPay = Number(payroll.totalNet || 0);
    const vacationAccumulated = items.reduce((s: number, i: any) => s + Number(i.vacationProvision || 0), 0);
    // Los tributos patronales gravan salario, libre, guardia y los suplementos
    // de tiempo (horas extras, nocturnidad, feriado). Vacaciones, liquidación,
    // subsidio y maternidad no generan aporte patronal ni UFT.
    const chargesEmployerTaxes = ['salario', 'libre', 'guardia', ...PayrollComponent.TIME_SUPPLEMENTS].includes(payroll.concept);
    const round2 = (v: number) => Math.round(v * 100) / 100;
    let aporte125 = 0;
    let provisions15 = 0;
    let laborForceTax5 = 0;
    if (chargesEmployerTaxes) {
      for (const i of items) {
        const gross = Number(i.grossSalary || 0);
        const vacationProvision = Number(i.vacationProvision || 0);
        const base = round2(gross + vacationProvision);
        aporte125 += round2(base * 0.125);
        provisions15 += round2(base * 0.015);
        laborForceTax5 += round2(base * 0.05);
      }
    }
    return {
      salary,
      vacation,
      incomeTax,
      specialSS,
      toPay,
      vacationAccumulated,
      employerSS14: round2(aporte125 + provisions15),
      aporte125: round2(aporte125),
      provisions15: round2(provisions15),
      laborForceTax5: round2(laborForceTax5),
    };
  }

  private showToast(message: string, type: 'success' | 'error' | 'warning') {
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

  getConceptLabel(concept: string): string {
    return this.concepts.find((c) => c.value === concept)?.label || 'Salario';
  }

  getConceptClass(concept: string): string {
    const map: Record<string, string> = {
      salario: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      vacaciones: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
      subsidio: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      maternidad: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
      horas_extras: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      nocturnidad: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
      guardia: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
      feriado: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      liquidacion: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      libre: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
    };
    return map[concept] || map['salario'];
  }
}
