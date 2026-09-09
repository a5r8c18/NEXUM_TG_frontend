import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaginationComponent, PaginationConfig } from '../../../shared/components/pagination/pagination.component';
import { HrService, Attendance, Employee } from '../../../core/services/hr.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-attendance',
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
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Asistencia</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Entradas, salidas y horas extra que se trasladan al devengo de la nómina</p>
        </div>
        <button (click)="openCreate()" class="inline-flex items-center justify-center gap-2 bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors text-sm font-medium shadow-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Registrar
        </button>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Registros</p>
          <p class="text-2xl font-bold text-slate-900 dark:text-white mt-1">{{ attendance().length }}</p>
        </div>
        <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Presentes</p>
          <p class="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{{ countByStatus('present') }}</p>
        </div>
        <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Ausentes</p>
          <p class="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{{ countByStatus('absent') }}</p>
        </div>
        <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Horas extra</p>
          <p class="text-2xl font-bold text-slate-900 dark:text-white mt-1">{{ totalOvertime() | number:'1.2-2' }}</p>
        </div>
      </div>

      <!-- Filtros -->
      <div class="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input type="date" [(ngModel)]="filterDate" (change)="loadData()" class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"/>
          <select [(ngModel)]="filterStatus" (change)="loadData()" class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
            <option value="">Todos los estados</option><option value="present">Presente</option><option value="absent">Ausente</option><option value="late">Tarde</option><option value="leave">Permiso</option><option value="holiday">Feriado</option>
          </select>
        </div>
      </div>

      <!-- Tabla -->
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      @if (isLoading()) {
        <div class="flex items-center justify-center py-20">
          <div class="flex flex-col items-center gap-3 text-slate-500">
            <svg class="w-8 h-8 animate-spin text-cyan-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <span class="text-sm">Cargando asistencia...</span>
          </div>
        </div>
      } @else {
        <div class="overflow-x-auto">
          <table class="w-full text-sm"><thead class="bg-slate-50 dark:bg-slate-900/50"><tr>
            <th class="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Empleado</th>
            <th class="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Fecha</th>
            <th class="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Entrada</th>
            <th class="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Salida</th>
            <th class="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Horas</th>
            <th class="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Extra</th>
            <th class="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Estado</th>
            <th class="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Acciones</th>
          </tr></thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
            @for (a of pagedAttendance(); track a.id) {
              <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <td class="px-4 py-3 font-medium text-slate-900 dark:text-white">{{ a.employeeName }}</td>
                <td class="px-4 py-3 dark:text-slate-300">{{ a.date }}</td>
                <td class="px-4 py-3 dark:text-slate-300">{{ a.checkIn || '-' }}</td>
                <td class="px-4 py-3 dark:text-slate-300">{{ a.checkOut || '-' }}</td>
                <td class="px-4 py-3 text-right font-semibold dark:text-white">{{ a.hoursWorked | number:'1.2-2' }}</td>
                <td class="px-4 py-3 text-right dark:text-slate-300">{{ a.overtimeHours | number:'1.2-2' }}</td>
                <td class="px-4 py-3 text-center"><span class="px-2 py-1 rounded-full text-xs font-medium" [class]="statusClass(a.status)">{{ statusLabel(a.status) }}</span></td>
                <td class="px-4 py-3"><div class="flex justify-center gap-1">
                  <button (click)="openEdit(a)" title="Editar" class="p-1.5 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 rounded-lg transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
                  <button (click)="deleteAttendance(a)" title="Eliminar" class="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                </div></td>
              </tr>
            } @empty {
              <tr><td colspan="8" class="px-4 py-16 text-center">
                <p class="text-sm font-medium text-slate-600 dark:text-slate-300">No hay registros</p>
                <p class="text-xs text-slate-400 dark:text-slate-500">Registre la asistencia del día seleccionado</p>
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
        <app-modal [isOpen]="isModalOpen()" (closeEvent)="closeModal()" (confirmEvent)="save()" [title]="editingId() ? 'Editar Asistencia' : 'Registrar Asistencia'" [confirmText]="isSaving() ? 'Guardando...' : 'Guardar'" confirmButtonClass="bg-cyan-600 hover:bg-cyan-700">
          <div class="space-y-4">
            <div class="space-y-1"><label class="text-xs font-medium text-slate-600">Empleado <span class="text-red-500">*</span></label>
              <select [(ngModel)]="form.employeeId" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm">
                <option [ngValue]="''">Seleccione...</option>
                @for (e of employees(); track e.id) { <option [ngValue]="e.id">{{ e.firstName }} {{ e.lastName }}</option> }
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1"><label class="text-xs font-medium text-slate-600">Fecha <span class="text-red-500">*</span></label><input type="date" [(ngModel)]="form.date" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"/></div>
              <div class="space-y-1"><label class="text-xs font-medium text-slate-600">Estado</label>
                <select [(ngModel)]="form.status" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm">
                  <option value="present">Presente</option><option value="absent">Ausente</option><option value="late">Tarde</option><option value="leave">Permiso</option><option value="holiday">Feriado</option>
                </select>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1"><label class="text-xs font-medium text-slate-600">Entrada</label><input type="time" [(ngModel)]="form.checkIn" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"/></div>
              <div class="space-y-1"><label class="text-xs font-medium text-slate-600">Salida</label><input type="time" [(ngModel)]="form.checkOut" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"/></div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1"><label class="text-xs font-medium text-slate-600">Horas trabajadas</label><input type="number" step="0.01" [(ngModel)]="form.hoursWorked" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"/></div>
              <div class="space-y-1"><label class="text-xs font-medium text-slate-600">Horas extra</label><input type="number" step="0.01" [(ngModel)]="form.overtimeHours" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"/></div>
            </div>
            <div class="space-y-1"><label class="text-xs font-medium text-slate-600">Notas</label><textarea [(ngModel)]="form.notes" rows="2" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"></textarea></div>
          </div>
        </app-modal>
      }
    </div>
  `
})
export class AttendanceComponent implements OnInit {
  private hrService = inject(HrService);
  private confirmDialog = inject(ConfirmDialogService);

  attendance = signal<Attendance[]>([]);
  employees = signal<Employee[]>([]);
  currentPage = signal(1);
  pageSize = 10;
  isLoading = signal(false);
  isSaving = signal(false);
  isModalOpen = signal(false);
  editingId = signal<string | null>(null);
  toast = signal<{type: 'success' | 'error', message: string} | null>(null);
  filterDate = new Date().toISOString().split('T')[0];
  filterStatus = '';
  form: any = this.emptyForm();

  pagedAttendance = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.attendance().slice(start, start + this.pageSize);
  });

  paginationConfig = computed<PaginationConfig>(() => ({
    currentPage: this.currentPage(),
    totalItems: this.attendance().length,
    totalPages: Math.ceil(this.attendance().length / this.pageSize),
    itemsPerPage: this.pageSize,
  }));

  onPageChange(page: number) { this.currentPage.set(page); }

  ngOnInit() { this.loadData(); }

  private emptyForm() {
    return { employeeId: '', date: new Date().toISOString().split('T')[0], checkIn: '', checkOut: '', hoursWorked: 0, overtimeHours: 0, status: 'present', notes: '' };
  }

  loadData() {
    this.isLoading.set(true);
    this.hrService.getAttendance({ date: this.filterDate, status: this.filterStatus }).subscribe({
      next: (res: any) => { this.attendance.set(res.attendance || res || []); this.currentPage.set(1); this.isLoading.set(false); },
      error: () => { this.isLoading.set(false); this.showToast('error', 'Error cargando asistencia'); }
    });
    this.hrService.getEmployees().subscribe({
      next: (res: any) => this.employees.set(res.employees || res || []),
      error: () => this.showToast('error', 'Error cargando empleados')
    });
  }

  countByStatus(status: string): number { return this.attendance().filter(a => a.status === status).length; }
  totalOvertime(): number { return this.attendance().reduce((sum, a) => sum + Number(a.overtimeHours || 0), 0); }

  statusLabel(s: string) { return { present: 'Presente', absent: 'Ausente', late: 'Tarde', leave: 'Permiso', holiday: 'Feriado' }[s] || s; }
  statusClass(s: string) { return { present: 'bg-green-100 text-green-700', absent: 'bg-red-100 text-red-700', late: 'bg-amber-100 text-amber-700', leave: 'bg-blue-100 text-blue-700', holiday: 'bg-violet-100 text-violet-700' }[s] || 'bg-slate-100 text-slate-600'; }

  openCreate() { this.editingId.set(null); this.form = this.emptyForm(); this.isModalOpen.set(true); }
  openEdit(a: Attendance) { this.editingId.set(a.id); this.form = { ...a }; this.isModalOpen.set(true); }
  closeModal() { this.isModalOpen.set(false); }

  save() {
    if (!this.form.employeeId || !this.form.date) { this.showToast('error', 'Empleado y fecha son obligatorios'); return; }
    const empId = String(this.form.employeeId);
    const emp = this.employees().find(e => e.id === empId);
    const payload = { ...this.form, employeeId: empId, employeeName: emp ? `${emp.firstName} ${emp.lastName}` : this.form.employeeName };
    this.isSaving.set(true);
    const obs = this.editingId() ? this.hrService.updateAttendance(this.editingId()!, payload) : this.hrService.createAttendance(payload);
    obs.subscribe({
      next: () => { this.isSaving.set(false); this.isModalOpen.set(false); this.showToast('success', this.editingId() ? 'Actualizado' : 'Registrado'); this.loadData(); },
      error: (err: any) => { this.isSaving.set(false); this.showToast('error', err.error?.message || 'Error guardando'); }
    });
  }

  async deleteAttendance(a: Attendance) {
    const confirmed = await this.confirmDialog.confirm('Eliminar registro', `¿Eliminar asistencia de ${a.employeeName} para ${a.date}?`);
    if (!confirmed) return;
    this.hrService.deleteAttendance(a.id).subscribe({
      next: () => { this.showToast('success', 'Eliminado'); this.loadData(); },
      error: () => this.showToast('error', 'Error eliminando')
    });
  }

  showToast(type: 'success' | 'error', message: string) { this.toast.set({ type, message }); setTimeout(() => this.toast.set(null), 3000); }
}
