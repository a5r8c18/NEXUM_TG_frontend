import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaginationComponent, PaginationConfig } from '../../../shared/components/pagination/pagination.component';
import { HrService, LeaveRequest, Employee } from '../../../core/services/hr.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-leaves',
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
          <div class="p-2 bg-rose-100 rounded-xl"><svg class="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></div>
          <div><h2 class="text-xl font-semibold text-slate-800">Vacaciones / Licencias</h2><p class="text-xs text-slate-500">Solicitudes, aprobaciones y días disponibles</p></div>
        </div>
        <button (click)="openCreate()" class="px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-xl hover:bg-rose-700 shadow-sm">+ Solicitar</button>
      </div>
      <div class="flex gap-3 mb-4">
        <select [(ngModel)]="filterStatus" (change)="loadData()" class="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm">
          <option value="">Todos</option><option value="pending">Pendiente</option><option value="approved">Aprobado</option><option value="rejected">Rechazado</option><option value="cancelled">Cancelado</option>
        </select>
        <select [(ngModel)]="filterType" (change)="loadData()" class="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm">
          <option value="">Todos</option><option value="vacation">Vacaciones</option><option value="sick">Incapacidad</option><option value="unpaid">Sin pago</option><option value="maternity">Maternidad</option><option value="paternity">Paternidad</option><option value="other">Otro</option>
        </select>
      </div>
      @if (isLoading()) {
        <div class="flex items-center justify-center py-20">
          <div class="flex flex-col items-center gap-3 text-slate-500">
            <svg class="w-8 h-8 animate-spin text-rose-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <span class="text-sm">Cargando licencias...</span>
          </div>
        </div>
      } @else {
        <div class="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200/50 overflow-hidden">
          <table class="w-full text-sm"><thead class="bg-slate-50 border-b border-slate-200"><tr>
            <th class="text-left px-5 py-3 font-medium text-slate-700 uppercase text-xs">Empleado</th>
            <th class="text-left px-5 py-3 font-medium text-slate-700 uppercase text-xs">Tipo</th>
            <th class="text-left px-5 py-3 font-medium text-slate-700 uppercase text-xs">Desde</th>
            <th class="text-left px-5 py-3 font-medium text-slate-700 uppercase text-xs">Hasta</th>
            <th class="text-right px-5 py-3 font-medium text-slate-700 uppercase text-xs">Días</th>
            <th class="text-center px-5 py-3 font-medium text-slate-700 uppercase text-xs">Estado</th>
            <th class="text-center px-5 py-3 font-medium text-slate-700 uppercase text-xs">Acciones</th>
          </tr></thead>
          <tbody class="divide-y divide-slate-200">
            @for (l of pagedLeaves(); track l.id) {
              <tr class="hover:bg-slate-50/50">
                <td class="px-5 py-4 font-medium text-slate-700">{{ l.employeeName }}</td>
                <td class="px-5 py-4 text-slate-600">{{ typeLabel(l.type) }}</td>
                <td class="px-5 py-4 text-slate-600">{{ l.startDate }}</td>
                <td class="px-5 py-4 text-slate-600">{{ l.endDate }}</td>
                <td class="px-5 py-4 text-right font-semibold text-slate-900">{{ l.days }}</td>
                <td class="px-5 py-4 text-center"><span class="px-2 py-1 rounded-full text-xs font-medium" [class]="statusClass(l.status)">{{ statusLabel(l.status) }}</span></td>
                <td class="px-5 py-4"><div class="flex justify-center gap-1">
                  <button (click)="openEdit(l)" class="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg" title="Editar"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
                  @if (l.status === 'pending') {
                    <button (click)="setStatus(l, 'approved')" class="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Aprobar">✓</button>
                    <button (click)="setStatus(l, 'rejected')" class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Rechazar">✕</button>
                  }
                  <button (click)="deleteLeave(l)" class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Eliminar"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                </div></td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="px-5 py-8 text-center text-slate-500">No hay solicitudes</td></tr>
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
        <app-modal [isOpen]="isModalOpen()" (closeEvent)="closeModal()" (confirmEvent)="save()" [title]="editingId() ? 'Editar Solicitud' : 'Nueva Solicitud'" [confirmText]="isSaving() ? 'Guardando...' : 'Guardar'" confirmButtonClass="bg-rose-600 hover:bg-rose-700">
          <div class="space-y-4">
            <div class="space-y-1"><label class="text-xs font-medium text-slate-600">Empleado <span class="text-red-500">*</span></label>
              <select [(ngModel)]="form.employeeId" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm">
                <option [ngValue]="''">Seleccione...</option>
                @for (e of employees(); track e.id) { <option [ngValue]="e.id">{{ e.firstName }} {{ e.lastName }}</option> }
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1"><label class="text-xs font-medium text-slate-600">Tipo</label>
                <select [(ngModel)]="form.type" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm">
                  <option value="vacation">Vacaciones</option><option value="sick">Incapacidad</option><option value="unpaid">Sin pago</option><option value="maternity">Maternidad</option><option value="paternity">Paternidad</option><option value="other">Otro</option>
                </select>
              </div>
              <div class="space-y-1"><label class="text-xs font-medium text-slate-600">Días</label><input type="number" [(ngModel)]="form.days" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"/></div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1"><label class="text-xs font-medium text-slate-600">Desde <span class="text-red-500">*</span></label><input type="date" [(ngModel)]="form.startDate" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"/></div>
              <div class="space-y-1"><label class="text-xs font-medium text-slate-600">Hasta <span class="text-red-500">*</span></label><input type="date" [(ngModel)]="form.endDate" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"/></div>
            </div>
            <div class="space-y-1"><label class="text-xs font-medium text-slate-600">Motivo</label><textarea [(ngModel)]="form.reason" rows="2" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"></textarea></div>
          </div>
        </app-modal>
      }
    </div>
  `
})
export class LeavesComponent implements OnInit {
  private hrService = inject(HrService);
  private confirmDialog = inject(ConfirmDialogService);

  leaves = signal<LeaveRequest[]>([]);
  employees = signal<Employee[]>([]);
  currentPage = signal(1);
  pageSize = 10;
  isLoading = signal(false);
  isSaving = signal(false);
  isModalOpen = signal(false);
  editingId = signal<string | null>(null);
  toast = signal<{type: 'success' | 'error', message: string} | null>(null);
  filterStatus = '';
  filterType = '';
  form: any = this.emptyForm();

  pagedLeaves = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.leaves().slice(start, start + this.pageSize);
  });

  paginationConfig = computed<PaginationConfig>(() => ({
    currentPage: this.currentPage(),
    totalItems: this.leaves().length,
    totalPages: Math.ceil(this.leaves().length / this.pageSize),
    itemsPerPage: this.pageSize,
  }));

  onPageChange(page: number) { this.currentPage.set(page); }

  ngOnInit() { this.loadData(); }

  private emptyForm() {
    return { employeeId: '', type: 'vacation', startDate: '', endDate: '', days: 0, reason: '', status: 'pending' };
  }

  loadData() {
    this.isLoading.set(true);
    this.hrService.getLeaves({ status: this.filterStatus, type: this.filterType }).subscribe({
      next: (res: any) => { this.leaves.set(res.leaves || res || []); this.currentPage.set(1); this.isLoading.set(false); },
      error: () => { this.isLoading.set(false); this.showToast('error', 'Error cargando solicitudes'); }
    });
    this.hrService.getEmployees().subscribe({
      next: (res: any) => this.employees.set(res.employees || res || []),
      error: () => this.showToast('error', 'Error cargando empleados')
    });
  }

  typeLabel(t: string) { return { vacation: 'Vacaciones', sick: 'Incapacidad', unpaid: 'Sin pago', maternity: 'Maternidad', paternity: 'Paternidad', other: 'Otro' }[t] || t; }
  statusLabel(s: string) { return { pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado', cancelled: 'Cancelado' }[s] || s; }
  statusClass(s: string) { return { pending: 'bg-amber-100 text-amber-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700', cancelled: 'bg-slate-100 text-slate-600' }[s] || 'bg-slate-100 text-slate-600'; }

  openCreate() { this.editingId.set(null); this.form = this.emptyForm(); this.isModalOpen.set(true); }
  openEdit(l: LeaveRequest) { this.editingId.set(l.id); this.form = { ...l }; this.isModalOpen.set(true); }
  closeModal() { this.isModalOpen.set(false); }

  save() {
    if (!this.form.employeeId || !this.form.startDate || !this.form.endDate) { this.showToast('error', 'Empleado, inicio y fin son obligatorios'); return; }
    const empId = String(this.form.employeeId);
    const emp = this.employees().find(e => e.id === empId);
    const payload = { ...this.form, employeeId: empId, employeeName: emp ? `${emp.firstName} ${emp.lastName}` : this.form.employeeName };
    this.isSaving.set(true);
    const obs = this.editingId() ? this.hrService.updateLeave(this.editingId()!, payload) : this.hrService.createLeave(payload);
    obs.subscribe({
      next: () => { this.isSaving.set(false); this.isModalOpen.set(false); this.showToast('success', this.editingId() ? 'Solicitud actualizada' : 'Solicitud creada'); this.loadData(); },
      error: (err: any) => { this.isSaving.set(false); this.showToast('error', err.error?.message || 'Error guardando'); }
    });
  }

  async setStatus(l: LeaveRequest, status: 'approved' | 'rejected' | 'cancelled') {
    const confirmed = await this.confirmDialog.confirm('Cambiar estado', `¿${status === 'approved' ? 'Aprobar' : 'Rechazar'} solicitud de ${l.employeeName}?`);
    if (!confirmed) return;
    this.hrService.setLeaveStatus(l.id, status, 'Admin').subscribe({
      next: () => { this.showToast('success', 'Estado actualizado'); this.loadData(); },
      error: () => this.showToast('error', 'Error actualizando estado')
    });
  }

  async deleteLeave(l: LeaveRequest) {
    const confirmed = await this.confirmDialog.confirm('Eliminar solicitud', `¿Eliminar solicitud de ${l.employeeName}?`);
    if (!confirmed) return;
    this.hrService.deleteLeave(l.id).subscribe({
      next: () => { this.showToast('success', 'Eliminada'); this.loadData(); },
      error: () => this.showToast('error', 'Error eliminando')
    });
  }

  showToast(type: 'success' | 'error', message: string) { this.toast.set({ type, message }); setTimeout(() => this.toast.set(null), 3000); }
}
