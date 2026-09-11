import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaginationComponent, PaginationConfig } from '../../../shared/components/pagination/pagination.component';
import { HrService, JobPosition, Department } from '../../../core/services/hr.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-positions',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, PaginationComponent],
  template: `
    <div class="p-6 space-y-5">

      <!-- Toast -->
      @if (toast()) {
        <div class="fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border"
             [class.bg-green-50]="toast()!.type === 'success'"
             [class.text-green-800]="toast()!.type === 'success'"
             [class.border-green-200]="toast()!.type === 'success'"
             [class.bg-red-50]="toast()!.type === 'error'"
             [class.text-red-800]="toast()!.type === 'error'"
             [class.border-red-200]="toast()!.type === 'error'">
          {{ toast()!.message }}
        </div>
      }

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Cargos</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Plazas, denominaciones y salario de referencia del personal</p>
        </div>
        <button (click)="openCreate()"
           class="inline-flex items-center justify-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors text-sm font-medium shadow-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Nuevo Cargo
        </button>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Cargos</p>
          <p class="text-2xl font-bold text-slate-900 dark:text-white mt-1">{{ positions().length }}</p>
        </div>
        <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Activos</p>
          <p class="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{{ activeCount() }}</p>
        </div>
        <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Plazas ocupadas</p>
          <p class="text-2xl font-bold text-cyan-600 dark:text-cyan-400 mt-1">{{ occupiedCount() }}</p>
        </div>
        <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Salario promedio</p>
          <p class="text-2xl font-bold text-slate-900 dark:text-white mt-1">{{ averageSalary() | number:'1.2-2' }}</p>
        </div>
      </div>

      <!-- Loading -->
      @if (isLoading()) {
        <div class="flex items-center justify-center py-20 text-slate-500">
          <svg class="w-8 h-8 animate-spin text-violet-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        </div>
      }

      <!-- Grid -->
      @if (!isLoading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (pos of pagedPositions(); track pos.id) {
            <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow">
              <div class="flex items-start justify-between">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <h3 class="text-base font-semibold text-slate-900 dark:text-white truncate">{{ pos.name }}</h3>
                    @if (!pos.isActive) {
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">Inactivo</span>
                    }
                  </div>
                  @if (pos.description) {
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{{ pos.description }}</p>
                  }
                </div>
                <div class="flex gap-1 flex-shrink-0">
                  <button (click)="openEdit(pos)"
                          class="p-1.5 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-lg transition-colors" title="Editar">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  <button (click)="deletePosition(pos)"
                          class="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Eliminar">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div class="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span class="inline-flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  {{ pos.employeeCount || 0 }} empleados
                </span>
                <span class="font-semibold text-slate-700 dark:text-slate-200">{{ pos.baseSalary | number:'1.2-2' }}</span>
                @if (pos.departmentName) {
                  <span>{{ pos.departmentName }}</span>
                }
              </div>
            </div>
          }
          @empty {
            <div class="col-span-full bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 py-16 text-center">
              <p class="text-sm font-medium text-slate-600 dark:text-slate-300">No hay cargos registrados</p>
              <p class="text-xs text-slate-400 dark:text-slate-500">Cree el primer cargo para estandarizar los puestos y salarios</p>
            </div>
          }
        </div>

        @if (paginationConfig().totalPages > 1) {
          <app-pagination [config]="paginationConfig()" (pageChange)="onPageChange($event)" />
        }
      }

      <!-- Modal Crear / Editar -->
      @if (isModalOpen()) {
        <app-modal [isOpen]="isModalOpen()" (closeEvent)="closeModal()" (confirmEvent)="save()"
                   [title]="editingId() ? 'Editar Cargo' : 'Nuevo Cargo'"
                   [confirmText]="isSaving() ? 'Guardando...' : (editingId() ? 'Guardar cambios' : 'Crear')"
                   confirmButtonClass="bg-violet-600 hover:bg-violet-700"
                   maxWidthClass="max-w-lg">
          <div class="space-y-4">
            <div class="space-y-1">
              <label class="text-xs font-medium text-slate-600 dark:text-slate-400">Nombre <span class="text-red-500">*</span></label>
              <input type="text" [(ngModel)]="form.name"
                     class="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"/>
            </div>
            <div class="space-y-1">
              <label class="text-xs font-medium text-slate-600 dark:text-slate-400">Descripción</label>
              <textarea rows="3" [(ngModel)]="form.description"
                        class="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"></textarea>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <label class="text-xs font-medium text-slate-600 dark:text-slate-400">Salario base <span class="text-red-500">*</span></label>
                <input type="number" step="0.01" [(ngModel)]="form.baseSalary" (ngModelChange)="calculateSalaryRate()"
                       class="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-right"/>
              </div>
              <div class="space-y-1">
                <label class="text-xs font-medium text-slate-600 dark:text-slate-400">Jornada (horas)</label>
                <input type="number" step="0.01" [(ngModel)]="form.workingHours"
                       class="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-right"/>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <label class="text-xs font-medium text-slate-600 dark:text-slate-400">Fondo de tiempo</label>
                <input type="number" step="0.01" [(ngModel)]="form.timeBank" (ngModelChange)="calculateSalaryRate()"
                       class="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-right"/>
              </div>
              <div class="space-y-1">
                <label class="text-xs font-medium text-slate-600 dark:text-slate-400">Unidad</label>
                <select [(ngModel)]="form.timeUnit"
                        class="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent">
                  <option value="hours">Horas</option>
                  <option value="days">Días</option>
                </select>
              </div>
            </div>
            <div class="space-y-1">
              <label class="text-xs font-medium text-slate-600 dark:text-slate-400">Tasa salarial</label>
              <input type="number" step="0.0001" [(ngModel)]="form.salaryRate" [readOnly]="true"
                     class="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-white focus:outline-none text-right"/>
              <p class="text-xs text-slate-500">Salario / Fondo de tiempo</p>
            </div>
            <div class="space-y-1">
              <label class="text-xs font-medium text-slate-600 dark:text-slate-400">Concepto de pago</label>
              <input type="text" [(ngModel)]="form.paymentConcept"
                     class="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"/>
            </div>
            <div class="space-y-1">
              <label class="text-xs font-medium text-slate-600 dark:text-slate-400">Departamento (opcional)</label>
              <select [(ngModel)]="form.departmentId"
                      class="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent">
                <option [ngValue]="null">Sin departamento</option>
                @for (dept of departments(); track dept.id) {
                  <option [ngValue]="dept.id">{{ dept.name }}</option>
                }
              </select>
            </div>
            <div class="flex items-center gap-3">
              <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input type="checkbox" [(ngModel)]="form.isActive" class="rounded border-slate-300 text-violet-600 focus:ring-violet-500"/>
                Activo
              </label>
            </div>
          </div>
        </app-modal>
      }

    </div>
  `,
})
export class PositionsComponent implements OnInit {
  private hrService = inject(HrService);
  private confirmDialog = inject(ConfirmDialogService);

  positions = signal<JobPosition[]>([]);
  departments = signal<Department[]>([]);
  currentPage = signal(1);
  pageSize = 9;
  isLoading = signal(false);
  isSaving = signal(false);
  isModalOpen = signal(false);
  editingId = signal<string | null>(null);
  toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);

  form: Partial<JobPosition> = this.emptyForm();

  activeCount = computed(() => this.positions().filter(p => p.isActive).length);
  occupiedCount = computed(() => this.positions().reduce((sum, p) => sum + (p.employeeCount || 0), 0));
  averageSalary = computed(() => {
    const active = this.positions().filter(p => p.isActive);
    if (!active.length) return 0;
    return active.reduce((sum, p) => sum + Number(p.baseSalary || 0), 0) / active.length;
  });

  pagedPositions = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.positions().slice(start, start + this.pageSize);
  });

  paginationConfig = computed<PaginationConfig>(() => ({
    currentPage: this.currentPage(),
    totalItems: this.positions().length,
    totalPages: Math.ceil(this.positions().length / this.pageSize),
    itemsPerPage: this.pageSize,
  }));

  onPageChange(page: number) { this.currentPage.set(page); }

  private emptyForm(): Partial<JobPosition> {
    return { name: '', description: null, baseSalary: 0, workingHours: 8, timeBank: 0, timeUnit: 'hours', salaryRate: 0, paymentConcept: null, departmentId: null, isActive: true };
  }

  ngOnInit() { this.load(); this.loadDepartments(); }

  load() {
    this.isLoading.set(true);
    this.hrService.getPositions().subscribe({
      next: (data) => { this.positions.set(data); this.currentPage.set(1); this.isLoading.set(false); },
      error: () => { this.isLoading.set(false); this.showToast('Error al cargar cargos', 'error'); }
    });
  }

  loadDepartments() {
    this.hrService.getDepartments().subscribe({
      next: (data) => this.departments.set(data),
      error: () => this.showToast('Error al cargar departamentos', 'error')
    });
  }

  openCreate() {
    this.editingId.set(null);
    this.form = this.emptyForm();
    this.calculateSalaryRate();
    this.isModalOpen.set(true);
  }

  openEdit(pos: JobPosition) {
    this.editingId.set(pos.id);
    this.form = { ...pos };
    this.calculateSalaryRate();
    this.isModalOpen.set(true);
  }

  calculateSalaryRate() {
    const salary = Number(this.form.baseSalary) || 0;
    const bank = Number(this.form.timeBank) || 0;
    this.form.salaryRate = bank > 0 ? Number((salary / bank).toFixed(4)) : 0;
  }

  closeModal() { this.isModalOpen.set(false); }

  save() {
    if (!this.form.name?.trim()) {
      this.showToast('El nombre es obligatorio', 'error');
      return;
    }
    this.isSaving.set(true);
    const id = this.editingId();
    const request$ = id
      ? this.hrService.updatePosition(id, this.form)
      : this.hrService.createPosition(this.form);
    request$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showToast(id ? 'Cargo actualizado' : 'Cargo creado', 'success');
        this.closeModal();
        this.load();
      },
      error: (err: any) => {
        this.isSaving.set(false);
        this.showToast(err?.error?.message || 'Error al guardar el cargo', 'error');
      }
    });
  }

  async deletePosition(pos: JobPosition) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar cargo',
      message: `¿Eliminar el cargo ${pos.name}?`,
      confirmText: 'Eliminar',
      type: 'danger'
    });
    if (!confirmed) return;
    this.hrService.deletePosition(pos.id).subscribe({
      next: () => { this.showToast('Cargo eliminado', 'success'); this.load(); },
      error: (err: any) => this.showToast(err?.error?.message || 'Error al eliminar', 'error')
    });
  }

  private showToast(message: string, type: 'success' | 'error') {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
