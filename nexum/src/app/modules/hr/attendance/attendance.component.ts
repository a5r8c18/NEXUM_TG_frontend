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
    <div class="p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      @if (toast()) {
        <div class="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border"
             [class.bg-green-50]="toast()?.type === 'success'" [class.text-green-800]="toast()?.type === 'success'" [class.border-green-200]="toast()?.type === 'success'"
             [class.bg-red-50]="toast()?.type === 'error'" [class.text-red-800]="toast()?.type === 'error'" [class.border-red-200]="toast()?.type === 'error'">
          {{ toast()?.message }}
        </div>
      }
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-cyan-100 rounded-xl"><svg class="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
          <div><h2 class="text-xl font-semibold text-slate-800">Asistencia</h2><p class="text-xs text-slate-500">Registro diario de entrada, salida y horas</p></div>
        </div>
        <button (click)="openCreate()" class="px-4 py-2 bg-cyan-600 text-white text-sm font-medium rounded-xl hover:bg-cyan-700 shadow-sm">+ Registrar</button>
      </div>
      <div class="flex gap-3 mb-4">
        <input type="date" [(ngModel)]="filterDate" (change)="loadData()" class="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"/>
        <select [(ngModel)]="filterStatus" (change)="loadData()" class="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm">
          <option value="">Todos</option><option value="present">Presente</option><option value="absent">Ausente</option><option value="late">Tarde</option><option value="leave">Permiso</option><option value="holiday">Feriado</option>
        </select>
      </div>
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
        <div class="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200/50 overflow-hidden">
          <table class="w-full text-sm"><thead class="bg-slate-50 border-b border-slate-200"><tr>
            <th class="text-left px-5 py-3 font-medium text-slate-700 uppercase text-xs">Empleado</th>
            <th class="text-left px-5 py-3 font-medium text-slate-700 uppercase text-xs">Fecha</th>
            <th class="text-left px-5 py-3 font-medium text-slate-700 uppercase text-xs">Entrada</th>
            <th class="text-left px-5 py-3 font-medium text-slate-700 uppercase text-xs">Salida</th>
            <th class="text-right px-5 py-3 font-medium text-slate-700 uppercase text-xs">Horas</th>
            <th class="text-right px-5 py-3 font-medium text-slate-700 uppercase text-xs">Extra</th>
            <th class="text-center px-5 py-3 font-medium text-slate-700 uppercase text-xs">Estado</th>
            <th class="text-center px-5 py-3 font-medium text-slate-700 uppercase text-xs">Acciones</th>
          </tr></thead>
          <tbody class="divide-y divide-slate-200">
            @for (a of pagedAttendance(); track a.id) {
              <tr class="hover:bg-slate-50/50">
                <td class="px-5 py-4 font-medium text-slate-700">{{ a.employeeName }}</td>
                <td class="px-5 py-4 text-slate-600">{{ a.date }}</td>
                <td class="px-5 py-4 text-slate-600">{{ a.checkIn || '-' }}</td>
                <td class="px-5 py-4 text-slate-600">{{ a.checkOut || '-' }}</td>
                <td class="px-5 py-4 text-right font-semibold text-slate-900">{{ a.hoursWorked | number:'1.2-2' }}</td>
                <td class="px-5 py-4 text-right text-slate-900">{{ a.overtimeHours | number:'1.2-2' }}</td>
                <td class="px-5 py-4 text-center"><span class="px-2 py-1 rounded-full text-xs font-medium" [class]="statusClass(a.status)">{{ statusLabel(a.status) }}</span></td>
                <td class="px-5 py-4"><div class="flex justify-center gap-1">
                  <button (click)="openEdit(a)" class="p-1.5 text-cyan-600 hover:bg-cyan-50 rounded-lg"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
                  <button (click)="deleteAttendance(a)" class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                </div></td>
              </tr>
            } @empty {
              <tr><td colspan="8" class="px-5 py-8 text-center text-slate-500">No hay registros</td></tr>
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
