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
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Vacaciones / Licencias</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Solicitudes y aprobaciones que alimentan las nóminas de vacaciones, subsidio y maternidad</p>
        </div>
        <button (click)="openCreate()" class="inline-flex items-center justify-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 transition-colors text-sm font-medium shadow-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Nueva Solicitud
        </button>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Solicitudes</p>
          <p class="text-2xl font-bold text-slate-900 dark:text-white mt-1">{{ leaves().length }}</p>
        </div>
        <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Pendientes</p>
          <p class="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{{ countByStatus('pending') }}</p>
        </div>
        <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Aprobadas</p>
          <p class="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{{ countByStatus('approved') }}</p>
        </div>
        <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Días aprobados</p>
          <p class="text-2xl font-bold text-slate-900 dark:text-white mt-1">{{ approvedDays() }}</p>
        </div>
      </div>

      <!-- Filtros -->
      <div class="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select [(ngModel)]="filterStatus" (change)="loadData()" class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500">
            <option value="">Todos los estados</option><option value="pending">Pendiente</option><option value="approved">Aprobado</option><option value="rejected">Rechazado</option><option value="cancelled">Cancelado</option>
          </select>
          <select [(ngModel)]="filterType" (change)="loadData()" class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500">
            <option value="">Todos los tipos</option><option value="vacation">Vacaciones</option><option value="sick">Incapacidad</option><option value="unpaid">Sin pago</option><option value="maternity">Maternidad</option><option value="paternity">Paternidad</option><option value="other">Otro</option>
          </select>
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
            <span class="text-sm">Cargando licencias...</span>
          </div>
        </div>
      } @else {
        <div class="overflow-x-auto">
          <table class="w-full text-sm"><thead class="bg-slate-50 dark:bg-slate-900/50"><tr>
            <th class="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Empleado</th>
            <th class="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Tipo</th>
            <th class="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Desde</th>
            <th class="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Hasta</th>
            <th class="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Días</th>
            <th class="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Estado</th>
            <th class="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Acciones</th>
          </tr></thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
            @for (l of pagedLeaves(); track l.id) {
              <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <td class="px-4 py-3 font-medium text-slate-900 dark:text-white">{{ l.employeeName }}</td>
                <td class="px-4 py-3 dark:text-slate-300">{{ typeLabel(l.type) }}</td>
                <td class="px-4 py-3 dark:text-slate-300">{{ l.startDate }}</td>
                <td class="px-4 py-3 dark:text-slate-300">{{ l.endDate }}</td>
                <td class="px-4 py-3 text-right font-semibold dark:text-white">{{ l.days }}</td>
                <td class="px-4 py-3 text-center"><span class="px-2 py-1 rounded-full text-xs font-medium" [class]="statusClass(l.status)">{{ statusLabel(l.status) }}</span></td>
                <td class="px-4 py-3"><div class="flex justify-center gap-1">
                  <button (click)="openEdit(l)" class="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors" title="Editar"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
                  @if (l.status === 'pending') {
                    <button (click)="setStatus(l, 'approved')" class="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors" title="Aprobar"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg></button>
                    <button (click)="setStatus(l, 'rejected')" class="p-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors" title="Rechazar"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                  }
                  <button (click)="deleteLeave(l)" class="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Eliminar"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                </div></td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="px-4 py-16 text-center">
                <p class="text-sm font-medium text-slate-600 dark:text-slate-300">No hay solicitudes</p>
                <p class="text-xs text-slate-400 dark:text-slate-500">Registre una licencia para que la nómina pueda liquidarla</p>
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
            @if (form.type === 'sick') {
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1"><label class="text-xs font-medium text-slate-600">Origen</label>
                  <select [(ngModel)]="form.origin" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm">
                    <option value="common">Enfermedad común</option>
                    <option value="work">Accidente / enfermedad laboral</option>
                  </select>
                </div>
                <div class="space-y-1"><label class="text-xs font-medium text-slate-600">Certificado médico</label>
                  <input type="text" [(ngModel)]="form.medicalCertificate" placeholder="Nº de certificado" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"/>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <input type="checkbox" [(ngModel)]="form.hospitalized" id="hosp" class="rounded"/>
                <label for="hosp" class="text-xs text-slate-600">Hospitalizado (exime la carencia de 3 días)</label>
              </div>
              @if (form.hospitalized) {
                <div class="space-y-1"><label class="text-xs font-medium text-slate-600">Inicio de hospitalización</label>
                  <input type="date" [(ngModel)]="form.hospitalizationStart" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"/>
                </div>
              }
            }
            @if (form.type === 'maternity') {
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1"><label class="text-xs font-medium text-slate-600">Inicio prenatal</label>
                  <input type="date" [(ngModel)]="form.prenatalStart" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"/>
                </div>
                <div class="space-y-1"><label class="text-xs font-medium text-slate-600">Fecha del parto</label>
                  <input type="date" [(ngModel)]="form.birthDate" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"/>
                </div>
              </div>
              <div class="space-y-1"><label class="text-xs font-medium text-slate-600">Inicio posnatal</label>
                <input type="date" [(ngModel)]="form.postnatalStart" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"/>
              </div>
              <div class="flex items-center gap-2">
                <input type="checkbox" [(ngModel)]="form.multiplePregnancy" id="mult" class="rounded"/>
                <label for="mult" class="text-xs text-slate-600">Embarazo múltiple (8 semanas prenatales)</label>
              </div>
              <div class="space-y-1"><label class="text-xs font-medium text-slate-600">Prestación social (Art. 30)</label>
                <select [(ngModel)]="form.socialBenefitVariant" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm">
                  <option [ngValue]="null">No aplica</option>
                  <option value="mother">Madre cuida al menor (60%)</option>
                  <option value="mother_working">Madre reincorporada + prestación (60%)</option>
                  <option value="other_worker">Cedida a padre/abuelo trabajador (60% de su salario)</option>
                </select>
              </div>
              @if (form.socialBenefitVariant === 'other_worker') {
                <div class="space-y-1"><label class="text-xs font-medium text-slate-600">Beneficiario</label>
                  <select [(ngModel)]="form.beneficiaryEmployeeId" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm">
                    <option [ngValue]="null">Seleccione...</option>
                    @for (e of employees(); track e.id) { <option [ngValue]="e.id">{{ e.firstName }} {{ e.lastName }}</option> }
                  </select>
                </div>
              }
            }
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
    return {
      employeeId: '', type: 'vacation', startDate: '', endDate: '', days: 0, reason: '', status: 'pending',
      origin: 'common', hospitalized: false, hospitalizationStart: null, medicalCertificate: null,
      multiplePregnancy: false, birthDate: null, prenatalStart: null, postnatalStart: null,
      socialBenefitVariant: null, beneficiaryEmployeeId: null,
    };
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

  countByStatus(status: string): number { return this.leaves().filter(l => l.status === status).length; }
  approvedDays(): number { return this.leaves().filter(l => l.status === 'approved').reduce((sum, l) => sum + Number(l.days || 0), 0); }

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
