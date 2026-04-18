import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AccountingService, FiscalYear, AccountingPeriod } from '../../../../core/services/accounting.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-fiscal-years',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="p-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-gray-900">Gestión de Años Fiscales y Períodos</h2>
        <button
          (click)="openCreateModal()"
          class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <span>+</span> Nuevo Año Fiscal
        </button>
      </div>

      <!-- Fiscal Years List -->
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inicio</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fin</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Períodos</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            @for (year of fiscalYears(); track year.id) {
              <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{{ year.name }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-gray-500">{{ year.startDate }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-gray-500">{{ year.endDate }}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    [class]="year.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                    class="px-2 py-1 text-xs rounded-full"
                  >
                    {{ year.status === 'open' ? 'Abierto' : 'Cerrado' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-gray-500">{{ year.periods.length || 0 }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                  @if (year.status === 'open') {
                    <button
                      (click)="closeFiscalYear(year.id)"
                      class="text-red-600 hover:text-red-900 mr-3"
                    >
                      Cerrar
                    </button>
                  }
                  <button (click)="viewPeriods(year)" class="text-indigo-600 hover:text-indigo-900">
                    Ver Períodos
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Create Fiscal Year Modal -->
      @if (showCreateModal()) {
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 class="text-lg font-bold mb-4">Nuevo Año Fiscal</h3>
            <form [formGroup]="fiscalYearForm" (ngSubmit)="createFiscalYear()">
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  formControlName="name"
                  type="text"
                  class="w-full border rounded-lg px-3 py-2"
                  placeholder="Ej: 2026"
                />
              </div>
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
                <input
                  formControlName="startDate"
                  type="date"
                  class="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
                <input
                  formControlName="endDate"
                  type="date"
                  class="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div class="flex justify-end gap-3">
                <button
                  type="button"
                  (click)="closeCreateModal()"
                  class="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  [disabled]="fiscalYearForm.invalid || isLoading()"
                  class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Periods Modal -->
      @if (showPeriodsModal() && selectedYear()) {
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-bold">Períodos - {{ selectedYear()?.name }}</h3>
              <button (click)="closePeriodsModal()" class="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mes</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inicio</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fin</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                @for (period of selectedYear()?.periods || []; track period.id) {
                  <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3 font-medium text-gray-900">{{ period.month }}/{{ period.year }}</td>
                    <td class="px-4 py-3 text-gray-500">{{ period.startDate }}</td>
                    <td class="px-4 py-3 text-gray-500">{{ period.endDate }}</td>
                    <td class="px-4 py-3">
                      <span
                        [class]="period.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                        class="px-2 py-1 text-xs rounded-full"
                      >
                        {{ period.status === 'open' ? 'Abierto' : 'Cerrado' }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-right text-sm">
                      @if (period.status === 'open') {
                        <button
                          (click)="closePeriod(period.id)"
                          class="text-red-600 hover:text-red-900"
                        >
                          Cerrar
                        </button>
                      }
                      @if (period.status === 'closed') {
                        <button
                          (click)="reopenPeriod(period.id)"
                          class="text-green-600 hover:text-green-900"
                        >
                          Reabrir
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
})
export class FiscalYearsComponent implements OnInit {
  private accountingService = inject(AccountingService);
  private confirmDialog = inject(ConfirmDialogService);
  private fb = inject(FormBuilder);

  fiscalYears = signal<FiscalYear[]>([]);
  isLoading = signal(false);
  showCreateModal = signal(false);
  showPeriodsModal = signal(false);
  selectedYear = signal<FiscalYear | null>(null);
  toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);

  fiscalYearForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
  });

  ngOnInit() {
    this.loadFiscalYears();
  }

  loadFiscalYears() {
    this.isLoading.set(true);
    this.accountingService.getFiscalYears().subscribe({
      next: (years) => {
        this.fiscalYears.set(years);
        this.isLoading.set(false);
      },
      error: () => {
        this.showToast('Error al cargar años fiscales', 'error');
        this.isLoading.set(false);
      },
    });
  }

  openCreateModal() {
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
    this.fiscalYearForm.reset();
  }

  createFiscalYear() {
    if (this.fiscalYearForm.invalid) return;

    this.isLoading.set(true);
    const data = this.fiscalYearForm.value;

    this.accountingService.createFiscalYear(data).subscribe({
      next: () => {
        this.showToast('Año fiscal creado exitosamente', 'success');
        this.closeCreateModal();
        this.loadFiscalYears();
      },
      error: () => {
        this.showToast('Error al crear año fiscal', 'error');
        this.isLoading.set(false);
      },
    });
  }

  async closeFiscalYear(id: string) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Cerrar año fiscal',
      message: '¿Está seguro de cerrar este año fiscal? Esta acción no se puede deshacer.',
      confirmText: 'Cerrar',
      type: 'warning'
    });
    if (!confirmed) return;

    this.accountingService.closeFiscalYear(id).subscribe({
      next: () => {
        this.showToast('Año fiscal cerrado exitosamente', 'success');
        this.loadFiscalYears();
      },
      error: () => {
        this.showToast('Error al cerrar año fiscal', 'error');
      },
    });
  }

  viewPeriods(year: FiscalYear) {
    this.selectedYear.set(year);
    this.showPeriodsModal.set(true);
  }

  closePeriodsModal() {
    this.showPeriodsModal.set(false);
    this.selectedYear.set(null);
  }

  async closePeriod(id: string) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Cerrar período',
      message: '¿Está seguro de cerrar este período?',
      confirmText: 'Cerrar',
      type: 'warning'
    });
    if (!confirmed) return;

    this.accountingService.closePeriod(id).subscribe({
      next: () => {
        this.showToast('Período cerrado exitosamente', 'success');
        this.loadFiscalYears(); // Reload to get updated periods
      },
      error: () => {
        this.showToast('Error al cerrar período', 'error');
      },
    });
  }

  async reopenPeriod(id: string) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Reabrir período',
      message: '¿Está seguro de reabrir este período?',
      confirmText: 'Reabrir',
      type: 'info'
    });
    if (!confirmed) return;

    this.accountingService.reopenPeriod(id).subscribe({
      next: () => {
        this.showToast('Período reabierto exitosamente', 'success');
        this.loadFiscalYears();
      },
      error: () => {
        this.showToast('Error al reabrir período', 'error');
      },
    });
  }

  showToast(message: string, type: 'success' | 'error') {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
