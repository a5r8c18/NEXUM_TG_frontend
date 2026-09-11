import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PayrollService } from '../../../core/services/payroll.service';
import { HrService, Employee } from '../../../core/services/hr.service';
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
    <div class="p-6 space-y-5">
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
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <span class="text-sm">Cargando nóminas...</span>
          </div>
        </div>
      } @else {
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th class="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">No.</th>
                <th class="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Concepto</th>
                <th class="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Período</th>
                <th class="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Fecha Pago</th>
                <th class="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Total Bruto</th>
                <th class="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Total Neto</th>
                <th class="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Empleados</th>
                <th class="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Estado</th>
                <th class="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
              @for (payroll of pagedItems(); track payroll.id) {
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td class="px-4 py-3 dark:text-slate-300 font-mono text-xs">{{ payroll.id }}</td>
                  <td class="px-4 py-3">
                    <span [class]="getConceptClass(payroll.concept)" class="px-2 py-1 rounded-full text-xs font-medium">
                      {{ getConceptLabel(payroll.concept) }}{{ payroll.installment ? ' · Plazo ' + payroll.installment : '' }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-medium text-slate-900 dark:text-white">{{ payroll.period }}</div>
                    <div class="text-xs text-slate-500 dark:text-slate-400">{{ payroll.startDate }} → {{ payroll.endDate }}</div>
                  </td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ payroll.paidAt || '—' }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ payroll.totalGross | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 text-right font-semibold dark:text-white">{{ payroll.totalNet | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ (payroll.items?.length) || 0 }}</td>
                  <td class="px-4 py-3 text-center">
                    <span [class]="getStatusClass(payroll.status)" class="px-2 py-1 rounded-full text-xs font-medium">{{ getStatusLabel(payroll.status) }}</span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center justify-center gap-1">
                      <button (click)="openDetail(payroll)" title="Ver líneas" class="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      </button>
                      <button (click)="downloadPdf(payroll)" title="Descargar Modelo SC-4-06" class="p-1.5 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-lg transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h5.586a1 1 0 01.707.293l1.414 1.414a1 1 0 00.707.293H19a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                      </button>
                      @if (payroll.status === 'draft') {
                        <button (click)="openProcess(payroll)" class="px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">Procesar</button>
                      }
                      @if (payroll.status === 'processed') {
                        <button (click)="openPay(payroll.id)" class="px-2.5 py-1 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors">Pagar</button>
                      }
                      @if (['draft', 'processed'].includes(payroll.status)) {
                        <button (click)="cancel(payroll.id)" title="Cancelar y anular comprobantes" class="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9" class="px-4 py-16 text-center">
                    <svg class="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    <p class="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">No hay nóminas</p>
                    <p class="text-xs text-slate-400 dark:text-slate-500">Genere una nómina por concepto para comenzar</p>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
      </div>

      @if (!isLoading() && paginationConfig().totalPages > 1) {
        <app-pagination [config]="paginationConfig()" (pageChange)="onPageChange($event)" />
      }

      <!-- Modal Generar Nómina -->
      @if (showGenerate()) {
        <app-modal [isOpen]="showGenerate()" (closeEvent)="showGenerate.set(false)" (confirmEvent)="generate()"
                   title="Generar Nómina"
                   [confirmText]="isBusy() ? 'Generando...' : 'Generar'"
                   confirmButtonClass="bg-blue-600 hover:bg-blue-700"
                   maxWidthClass="max-w-md">
          <div class="space-y-4">
            <div class="space-y-1">
              <label class="text-xs font-medium text-slate-600">Concepto <span class="text-red-500">*</span></label>
              <select [(ngModel)]="genForm.concept" (ngModelChange)="onConceptChange()"
                      class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                @for (c of concepts; track c.value) {
                  <option [value]="c.value">{{ c.label }}</option>
                }
              </select>
            </div>
            <p class="text-xs text-slate-500">{{ conceptHint() }}</p>
            @if (genForm.concept === 'maternidad') {
              <div class="space-y-1">
                <label class="text-xs font-medium text-slate-600">Plazo de pago <span class="text-red-500">*</span></label>
                <select [(ngModel)]="genForm.installment"
                        class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option [ngValue]="1">1 — Prenatal (semanas 34-38/42)</option>
                  <option [ngValue]="2">2 — Postnatal (semanas 1-6)</option>
                  <option [ngValue]="3">3 — Postnatal (semanas 7-12)</option>
                </select>
              </div>
            }
            @if (genForm.concept === 'libre') {
              <div class="space-y-2">
                <label class="text-xs font-medium text-slate-600">Líneas del concepto libre <span class="text-red-500">*</span></label>
                @for (line of freeItems; track $index) {
                  <div class="flex gap-2 items-center">
                    <select [(ngModel)]="line.employeeId" class="flex-1 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs">
                      <option value="">— Empleado —</option>
                      @for (e of employees(); track e.id) {
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
                          <span class="text-xs text-slate-600 dark:text-slate-400">Días trabajados</span>
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
                          <span class="text-xs text-slate-600 dark:text-slate-400">Sindicato</span>
                          <input type="number" step="0.01" [(ngModel)]="item.unionDues" (ngModelChange)="recalcItem(item)" [disabled]="!isDetailEditable()" [class]="detailInputClass"/>
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
                      <span class="text-slate-500 dark:text-slate-400">Provisión vacaciones <span class="font-semibold text-slate-700 dark:text-slate-200">{{ item.vacationProvision | number:'1.2-2' }}</span></span>
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
            <p><strong>Sindicato:</strong> {{ receiptItem()?.unionDues | number:'1.2-2' }}</p>
            <p><strong>Otras retenciones:</strong> {{ receiptItem()?.otherDeductions | number:'1.2-2' }}</p>
            <p><strong>Provisión vacaciones:</strong> {{ receiptItem()?.vacationProvision | number:'1.2-2' }}</p>
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
  private hrService = inject(HrService);
  private accountingService = inject(AccountingService);
  private financeService = inject(FinanceService);
  private confirmDialog = inject(ConfirmDialogService);

  items = signal<any[]>([]);
  stats = signal<any>(null);
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
  conceptFilter = '';
  periodFilter = '';
  fromDate = '';
  toDate = '';

  concepts = [
    { value: 'salario', label: 'Salario' },
    { value: 'vacaciones', label: 'Vacaciones' },
    { value: 'subsidio', label: 'Subsidio' },
    { value: 'maternidad', label: 'Maternidad' },
    { value: 'paternidad', label: 'Paternidad' },
    { value: 'libre', label: 'Concepto libre' },
  ];
  employees = signal<Employee[]>([]);
  freeItems: { employeeId: string; amount: number; description: string }[] = [];

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

  genForm: { concept: string; period: string; startDate: string; endDate: string; installment: number } =
    { concept: 'salario', period: '', startDate: '', endDate: '', installment: 1 };
  processingId: number | null = null;
  selectedCostCenterId: string | null = null;
  payingId: number | null = null;
  selectedBankAccountId: string | null = null;

  ngOnInit() {
    this.loadData();
    this.loadStats();
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
    this.genForm = { concept: 'salario', period: '', startDate: '', endDate: '', installment: 1 };
    this.freeItems = [];
    this.showGenerate.set(true);
  }

  onConceptChange() {
    if (this.genForm.concept === 'libre' && this.employees().length === 0) {
      this.hrService.getEmployees({ status: 'active' }).subscribe({
        next: (data) => this.employees.set(data || []),
        error: () => this.showToast('No se pudieron cargar los empleados', 'error'),
      });
    }
  }

  conceptHint(): string {
    const hints: Record<string, string> = {
      salario: 'Borrador con todos los empleados activos: salario contractual, horas extra, ausencias, Contribución Especial (5%), provisión de vacaciones y retención 1,5% para subsidios.',
      vacaciones: 'Paga las licencias de vacaciones aprobadas que solapen el período. Se carga a la provisión 492, no a gasto.',
      subsidio: 'Paga las licencias por enfermedad aprobadas con certificado médico. Aplica carencia de 3 días, porcentajes 50-80% y mínimo legal. Se carga a la provisión 500.',
      maternidad: 'Paga un plazo de la licencia de maternidad según el salario promedio semanal. Sector estatal: recuperable (164-0030). Sector no estatal: paga la Filial INSS.',
      paternidad: 'Paga la licencia de paternidad aprobada. Se carga a la provisión 500.',
      libre: 'Nómina de concepto libre: defina manualmente empleado, importe y descripción de cada línea.',
    };
    return hints[this.genForm.concept] || '';
  }

  isConceptPayroll(): boolean {
    const c = this.detailPayroll()?.concept;
    return !!c && c !== 'salario';
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
    switch (this.genForm.concept) {
      case 'vacaciones':
        request = this.payrollService.generateVacations(this.genForm);
        break;
      case 'subsidio':
        request = this.payrollService.generateSubsidy(this.genForm);
        break;
      case 'maternidad':
        request = this.payrollService.generateMaternity(this.genForm);
        break;
      case 'paternidad':
        request = this.payrollService.generateSubsidy(this.genForm);
        break;
      case 'libre': {
        const items = this.freeItems.filter((i) => i.employeeId && i.amount > 0);
        if (items.length === 0) {
          this.showToast('Añada al menos una línea con empleado e importe', 'error');
          return;
        }
        request = this.payrollService.generateFree({ ...this.genForm, items });
        break;
      }
      default:
        request = this.payrollService.generate(this.genForm);
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

  openProcess(payroll: any) {
    this.processingId = payroll.id;
    this.selectedCostCenterId = null;
    this.showProcess.set(true);
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
    item.unionDues = Number(item.unionDues) || 0;
    item.pension = Number(item.pension) || 0;
    item.taxWithholding = Number(item.taxWithholding) || 0;
    item.otherDeductions = Number(item.otherDeductions) || 0;

    const isSalary = this.detailPayroll()?.concept === 'salario';
    if (isSalary) {
      const paidUnits = item.paidUnits > 0 ? item.paidUnits : 30;
      const baseEarnings = Number(((item.baseSalary / 30) * paidUnits).toFixed(2));
      item.grossSalary = baseEarnings + item.overtimePay + item.bonuses + item.commissions + item.allowances;
      item.paidUnits = paidUnits;
      item.vacationProvision = Number((item.baseSalary * 0.0909).toFixed(2));
    } else {
      item.grossSalary = Number(item.grossSalary) || 0;
      item.vacationProvision = Number((item.grossSalary * 0.0909).toFixed(2));
    }

    item.totalDeductions = item.socialSecurity + item.unionDues + item.pension + item.taxWithholding + item.otherDeductions;
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

  confirmProcess() {
    if (this.processingId == null) return;
    this.isBusy.set(true);
    this.payrollService.process(this.processingId, 'system', this.selectedCostCenterId || undefined).subscribe({
      next: () => {
        this.isBusy.set(false);
        this.showProcess.set(false);
        this.showToast('Nómina procesada y contabilizada', 'success');
        this.loadData();
        this.loadStats();
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

  downloadPdf(payroll: any) {
    const choice = window.prompt('Imprimir nómina por:\n1 = Días\n2 = Horas\n(Cancelar = Días por defecto)', '1');
    const unit: 'dias' | 'horas' = choice === '2' ? 'horas' : 'dias';
    this.payrollService.exportPdf(payroll.id, unit).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nomina-sc-4-06-${payroll.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.showToast('Error al generar el PDF de la nómina', 'error'),
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

  getConceptLabel(concept: string): string {
    return this.concepts.find((c) => c.value === concept)?.label || 'Salario';
  }

  getConceptClass(concept: string): string {
    const map: Record<string, string> = {
      salario: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      vacaciones: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
      subsidio: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      maternidad: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
      paternidad: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      libre: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
    };
    return map[concept] || map['salario'];
  }
}
