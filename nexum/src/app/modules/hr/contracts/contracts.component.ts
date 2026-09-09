import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaginationComponent, PaginationConfig } from '../../../shared/components/pagination/pagination.component';
import { HrService, EmployeeContract, Employee } from '../../../core/services/hr.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-contracts',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, PaginationComponent],
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
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Contratos</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Historial laboral y vínculos contractuales del personal</p>
        </div>
        <button (click)="openCreate()" class="inline-flex items-center justify-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors text-sm font-medium shadow-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Nuevo Contrato
        </button>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Contratos</p>
          <p class="text-2xl font-bold text-slate-900 dark:text-white mt-1">{{ contracts().length }}</p>
        </div>
        <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Activos</p>
          <p class="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{{ countByStatus('active') }}</p>
        </div>
        <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Vencidos</p>
          <p class="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{{ countByStatus('expired') }}</p>
        </div>
        <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Salario contratado</p>
          <p class="text-2xl font-bold text-slate-900 dark:text-white mt-1">{{ activeSalaryTotal() | number:'1.2-2' }}</p>
        </div>
      </div>

      <!-- Tabla -->
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      @if (isLoading()) {
        <div class="flex items-center justify-center py-20">
          <div class="flex flex-col items-center gap-3 text-slate-500">
            <svg class="w-8 h-8 animate-spin text-violet-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <span class="text-sm">Cargando contratos...</span>
          </div>
        </div>
      } @else {
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 dark:bg-slate-900/50"><tr>
              <th class="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Empleado</th>
              <th class="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Tipo</th>
              <th class="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Inicio</th>
              <th class="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Fin</th>
              <th class="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Salario</th>
              <th class="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Estado</th>
              <th class="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Acciones</th>
            </tr></thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
              @for (c of pagedContracts(); track c.id) {
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td class="px-4 py-3 font-medium text-slate-900 dark:text-white">{{ c.employeeName }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ contractTypeLabel(c.contractType) }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ c.startDate }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ c.endDate || 'Indefinido' }}</td>
                  <td class="px-4 py-3 text-right font-semibold dark:text-white">{{ c.salary | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 text-center"><span class="px-2 py-1 rounded-full text-xs font-medium" [class]="statusClass(c.status)">{{ statusLabel(c.status) }}</span></td>
                  <td class="px-4 py-3">
                    <div class="flex justify-center gap-1">
                      <button (click)="openEdit(c)" class="p-1.5 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-lg transition-colors" title="Editar"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
                      <button (click)="deleteContract(c)" class="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Eliminar"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="px-4 py-16 text-center">
                  <p class="text-sm font-medium text-slate-600 dark:text-slate-300">No hay contratos registrados</p>
                  <p class="text-xs text-slate-400 dark:text-slate-500">Registre el vínculo contractual de cada trabajador</p>
                </td></tr>
              }
            </tbody>
          </table>
        </div>
      }
      </div>

      @if (!isLoading() && paginationConfig().totalPages > 1) {
        <app-pagination [config]="paginationConfig()" (pageChange)="onPageChange($event)" />
      }

      @if (isModalOpen()) {
        <app-modal [isOpen]="isModalOpen()" (closeEvent)="closeModal()" (confirmEvent)="save()"
                   [title]="editingId() ? 'Editar Contrato' : 'Nuevo Contrato'"
                   [confirmText]="isSaving() ? 'Guardando...' : 'Guardar'"
                   confirmButtonClass="bg-violet-600 hover:bg-violet-700">
          <div class="space-y-4">
            <div class="space-y-1">
              <label class="text-xs font-medium text-slate-600">Empleado <span class="text-red-500">*</span></label>
              <select [(ngModel)]="form.employeeId" (ngModelChange)="onEmployeeChange()"
                      class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option [ngValue]="''">Seleccione...</option>
                @for (e of employees(); track e.id) { <option [ngValue]="e.id">{{ e.firstName }} {{ e.lastName }}</option> }
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <label class="text-xs font-medium text-slate-600">Tipo</label>
                <select [(ngModel)]="form.contractType"
                        class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="full_time">Tiempo completo</option>
                  <option value="part_time">Medio tiempo</option>
                  <option value="contractor">Contratista</option>
                  <option value="intern">Pasante</option>
                </select>
              </div>
              <div class="space-y-1">
                <label class="text-xs font-medium text-slate-600">Estado</label>
                <select [(ngModel)]="form.status"
                        class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="active">Activo</option>
                  <option value="expired">Vencido</option>
                  <option value="terminated">Terminado</option>
                  <option value="suspended">Suspendido</option>
                </select>
              </div>
            </div>
            <div class="space-y-1">
              <label class="text-xs font-medium text-slate-600">Cargo</label>
              <input type="text" [(ngModel)]="form.position" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"/>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <label class="text-xs font-medium text-slate-600">Fecha inicio <span class="text-red-500">*</span></label>
                <input type="date" [(ngModel)]="form.startDate" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"/>
              </div>
              <div class="space-y-1">
                <label class="text-xs font-medium text-slate-600">Fecha fin</label>
                <input type="date" [(ngModel)]="form.endDate" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"/>
              </div>
            </div>
            <div class="space-y-1">
              <label class="text-xs font-medium text-slate-600">Salario <span class="text-red-500">*</span></label>
              <input type="number" step="0.01" [(ngModel)]="form.salary" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"/>
            </div>
            <div class="space-y-1">
              <label class="text-xs font-medium text-slate-600">Notas</label>
              <textarea [(ngModel)]="form.notes" rows="2" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"></textarea>
            </div>
          </div>
        </app-modal>
      }
    </div>
  `
})
export class ContractsComponent implements OnInit {
  private hrService = inject(HrService);
  private confirmDialog = inject(ConfirmDialogService);

  contracts = signal<EmployeeContract[]>([]);
  employees = signal<Employee[]>([]);
  currentPage = signal(1);
  pageSize = 10;
  isLoading = signal(false);
  isSaving = signal(false);
  isModalOpen = signal(false);
  editingId = signal<string | null>(null);
  toast = signal<{type: 'success' | 'error', message: string} | null>(null);

  form: any = this.emptyForm();

  pagedContracts = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.contracts().slice(start, start + this.pageSize);
  });

  paginationConfig = computed<PaginationConfig>(() => ({
    currentPage: this.currentPage(),
    totalItems: this.contracts().length,
    totalPages: Math.ceil(this.contracts().length / this.pageSize),
    itemsPerPage: this.pageSize,
  }));

  onPageChange(page: number) { this.currentPage.set(page); }

  ngOnInit() {
    this.loadData();
  }

  private emptyForm() {
    return { employeeId: '', contractType: 'full_time', position: '', startDate: '', endDate: '', salary: 0, status: 'active', notes: '' };
  }

  loadData() {
    this.isLoading.set(true);
    this.hrService.getContracts().subscribe({
      next: (res: any) => { this.contracts.set(res.contracts || res || []); this.currentPage.set(1); this.isLoading.set(false); },
      error: () => { this.isLoading.set(false); this.showToast('error', 'Error cargando contratos'); }
    });
    this.hrService.getEmployees().subscribe({
      next: (res: any) => this.employees.set(res.employees || res || []),
      error: () => this.showToast('error', 'Error cargando empleados')
    });
  }

  countByStatus(status: string): number { return this.contracts().filter(c => c.status === status).length; }
  activeSalaryTotal(): number { return this.contracts().filter(c => c.status === 'active').reduce((sum, c) => sum + Number(c.salary || 0), 0); }

  contractTypeLabel(t: string) {
    return { full_time: 'Tiempo completo', part_time: 'Medio tiempo', contractor: 'Contratista', intern: 'Pasante' }[t] || t;
  }

  statusLabel(s: string) {
    return { active: 'Activo', expired: 'Vencido', terminated: 'Terminado', suspended: 'Suspendido' }[s] || s;
  }

  statusClass(s: string) {
    return { active: 'bg-green-100 text-green-700', expired: 'bg-amber-100 text-amber-700', terminated: 'bg-slate-100 text-slate-600', suspended: 'bg-red-100 text-red-700' }[s] || 'bg-slate-100 text-slate-600';
  }

  openCreate() {
    this.editingId.set(null);
    this.form = this.emptyForm();
    this.isModalOpen.set(true);
  }

  openEdit(c: EmployeeContract) {
    this.editingId.set(c.id);
    this.form = { ...c };
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  onEmployeeChange() {
    const empId = String(this.form.employeeId || '');
    const emp = this.employees().find(e => e.id === empId);
    if (emp) this.form.position = emp.position || this.form.position;
  }

  save() {
    if (!this.form.employeeId || !this.form.startDate || !this.form.salary) {
      this.showToast('error', 'Completa empleado, fecha inicio y salario');
      return;
    }
    const empId = String(this.form.employeeId);
    const emp = this.employees().find(e => e.id === empId);
    const payload = { ...this.form, employeeId: empId, employeeName: emp ? `${emp.firstName} ${emp.lastName}` : this.form.employeeName };
    this.isSaving.set(true);
    const obs = this.editingId() ? this.hrService.updateContract(this.editingId()!, payload) : this.hrService.createContract(payload);
    obs.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isModalOpen.set(false);
        this.showToast('success', this.editingId() ? 'Contrato actualizado' : 'Contrato creado');
        this.loadData();
      },
      error: (err: any) => {
        this.isSaving.set(false);
        this.showToast('error', err.error?.message || 'Error guardando contrato');
      }
    });
  }

  async deleteContract(c: EmployeeContract) {
    const confirmed = await this.confirmDialog.confirm('Eliminar contrato', `¿Eliminar contrato de ${c.employeeName}?`);
    if (!confirmed) return;
    this.hrService.deleteContract(c.id).subscribe({
      next: () => { this.showToast('success', 'Contrato eliminado'); this.loadData(); },
      error: () => this.showToast('error', 'Error eliminando contrato')
    });
  }

  showToast(type: 'success' | 'error', message: string) {
    this.toast.set({ type, message });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
